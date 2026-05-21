"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TransVaultPlugin
});
module.exports = __toCommonJS(main_exports);
var import_promises = __toESM(require("fs/promises"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  conflictStrategy: "skip",
  includeLinkedFiles: true,
  reviewDialogMode: "always",
  tagsForCopiedElements: "",
  alsoTagCopiedSourceElements: false,
  tagsForMovedElements: "",
  targets: []
};
var TRANSFER_MODE_METADATA = {
  copy: {
    menuTitle: "Copy to vault...",
    commandName: "Copy active file to vault...",
    targetModalTitle: "Choose a vault to copy to",
    icon: "copy-plus"
  },
  move: {
    menuTitle: "Move to vault...",
    commandName: "Move active file to vault...",
    targetModalTitle: "Choose a vault to move to",
    icon: "folder-symlink"
  }
};
var CONFLICT_STRATEGY_METADATA = {
  skip: {
    label: "Skip",
    description: "Existing destination files will be skipped during transfer."
  },
  "auto-rename": {
    label: "Auto-rename",
    description: "Existing destination files will be kept, and new copies will be renamed automatically."
  },
  overwrite: {
    label: "Overwrite",
    description: "Existing destination files will be replaced during transfer."
  }
};
function createDestinationId() {
  return `destination-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function createBlankDestination() {
  return {
    id: createDestinationId(),
    name: "",
    vaultPath: "",
    destinationPath: "",
    useDefaultAttachmentLocation: true,
    attachmentPath: ""
  };
}
function getDestinationDisplayName(target) {
  const trimmedName = target.name.trim();
  if (trimmedName.length > 0) {
    return trimmedName;
  }
  const trimmedVaultPath = target.vaultPath.trim();
  if (trimmedVaultPath.length === 0) {
    return "Unnamed destination";
  }
  const parts = trimmedVaultPath.split(/[/\\]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedVaultPath;
}
function getConflictStrategyLabel(strategy) {
  return CONFLICT_STRATEGY_METADATA[strategy].label;
}
function getConflictStrategyDescription(strategy) {
  return CONFLICT_STRATEGY_METADATA[strategy].description;
}
function formatCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}
function normalizeAbsolutePath(value) {
  return import_path.default.normalize(import_path.default.resolve(value));
}
function normalizeConfiguredPathInput(value) {
  let normalized = value.trim();
  if (normalized.startsWith('"') && normalized.endsWith('"') || normalized.startsWith("'") && normalized.endsWith("'")) {
    normalized = normalized.slice(1, -1).trim();
  }
  if (process.platform !== "win32") {
    if (normalized === "~") {
      normalized = import_os.default.homedir();
    } else if (normalized.startsWith("~/")) {
      normalized = import_path.default.join(import_os.default.homedir(), normalized.slice(2));
    } else if (normalized.startsWith("$HOME/")) {
      normalized = import_path.default.join(import_os.default.homedir(), normalized.slice("$HOME/".length));
    }
    normalized = normalized.replace(/\\([ !#$&'()*;<>?@[\]^`{|}~])/g, "$1");
  }
  return normalized;
}
function ensureAbsolutePath(value, label) {
  const trimmed = normalizeConfiguredPathInput(value);
  if (trimmed.length === 0) {
    throw new Error(`${label} is required.`);
  }
  if (!import_path.default.isAbsolute(trimmed)) {
    throw new Error(`${label} must be an absolute path.`);
  }
  return normalizeAbsolutePath(trimmed);
}
function toVaultRelativePath(vaultRoot, absolutePath) {
  return (0, import_obsidian.normalizePath)(import_path.default.relative(vaultRoot, absolutePath).split(import_path.default.sep).join("/"));
}
function cleanTagInput(value) {
  return value.split(",").map((entry) => entry.trim().replace(/^#+/, "")).filter((entry, index, items) => entry.length > 0 && items.indexOf(entry) === index);
}
function joinTagValues(existing, additions) {
  const normalized = /* @__PURE__ */ new Set();
  for (const tag of [...existing, ...additions]) {
    const clean = tag.trim().replace(/^#+/, "");
    if (clean.length > 0) {
      normalized.add(clean);
    }
  }
  return [...normalized];
}
function collectFrontmatterRange(content) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return null;
  }
  const matcher = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = content.match(matcher);
  if (!match || match.index !== 0) {
    return "invalid";
  }
  return {
    range: [0, match[0].length],
    body: match[1]
  };
}
function getExistingTagFormatting(frontmatterBody) {
  const tagsLine = frontmatterBody.match(/^tags:\s*(.+)$/m);
  if (!tagsLine) {
    if (/^tags:\s*$/m.test(frontmatterBody) || /^tags:\s*\r?\n/m.test(frontmatterBody)) {
      return "array";
    }
    return "unknown";
  }
  const value = tagsLine[1].trim();
  if (value.startsWith("[")) {
    return "array";
  }
  if (value.includes(",")) {
    return "comma";
  }
  if (/\s/.test(value)) {
    return "space";
  }
  return "string";
}
function extractExistingTags(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => typeof entry === "string" ? entry : String(entry ?? "")).map((entry) => entry.trim().replace(/^#+/, "")).filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    const separator = value.includes(",") ? "," : /\s+/;
    return value.split(separator).map((entry) => entry.trim().replace(/^#+/, "")).filter((entry) => entry.length > 0);
  }
  return [];
}
function isMarkdownFile(file) {
  return file.extension.toLowerCase() === "md";
}
function hasSelectedAncestor(filePath, selectedPaths) {
  const parts = (0, import_obsidian.normalizePath)(filePath).split("/");
  for (let index = 1; index < parts.length; index += 1) {
    if (selectedPaths.has(parts.slice(0, index).join("/"))) {
      return true;
    }
  }
  return false;
}
var DestinationResolver = class {
  async resolve(target) {
    const vaultPath = ensureAbsolutePath(target.vaultPath, "Destination vault path");
    const destinationPath = ensureAbsolutePath(target.destinationPath, "Destination path");
    const effectiveAttachmentPath = target.useDefaultAttachmentLocation ? await this.resolveDefaultAttachmentPath(vaultPath) : ensureAbsolutePath(target.attachmentPath, "Attachment path");
    await this.assertDirectoryExists(vaultPath, "Destination vault path");
    this.assertInsideVault(vaultPath, destinationPath, "Destination path");
    this.assertInsideVault(vaultPath, effectiveAttachmentPath, "Attachment path");
    await import_promises.default.mkdir(destinationPath, { recursive: true });
    await import_promises.default.mkdir(effectiveAttachmentPath, { recursive: true });
    return {
      ...target,
      vaultPath,
      destinationPath,
      effectiveAttachmentPath,
      attachmentPath: target.attachmentPath.trim()
    };
  }
  validate(target) {
    const errors = [];
    const trimmedVaultPath = normalizeConfiguredPathInput(target.vaultPath);
    const trimmedDestinationPath = normalizeConfiguredPathInput(target.destinationPath);
    const trimmedAttachmentPath = normalizeConfiguredPathInput(target.attachmentPath);
    if (trimmedVaultPath.length === 0) {
      errors.push("Destination vault path is required.");
    } else if (!import_path.default.isAbsolute(trimmedVaultPath)) {
      errors.push("Destination vault path must be absolute.");
    }
    if (trimmedDestinationPath.length === 0) {
      errors.push("Destination path is required.");
    } else if (!import_path.default.isAbsolute(trimmedDestinationPath)) {
      errors.push("Destination path must be absolute.");
    } else if (import_path.default.isAbsolute(trimmedVaultPath) && !this.isInsideVault(trimmedVaultPath, trimmedDestinationPath)) {
      errors.push("Destination path must be inside the destination vault.");
    }
    if (!target.useDefaultAttachmentLocation) {
      if (trimmedAttachmentPath.length === 0) {
        errors.push("Attachment path is required when automatic attachment detection is disabled.");
      } else if (!import_path.default.isAbsolute(trimmedAttachmentPath)) {
        errors.push("Attachment path must be absolute.");
      } else if (import_path.default.isAbsolute(trimmedVaultPath) && !this.isInsideVault(trimmedVaultPath, trimmedAttachmentPath)) {
        errors.push("Attachment path must be inside the destination vault.");
      }
    }
    return errors;
  }
  async resolveDefaultAttachmentPath(vaultPath) {
    const normalizedVaultPath = normalizeAbsolutePath(vaultPath);
    const configPath = import_path.default.join(normalizedVaultPath, ".obsidian", "app.json");
    try {
      const raw = await import_promises.default.readFile(configPath, "utf8");
      const parsed = JSON.parse(raw);
      const attachmentFolderPath = parsed.attachmentFolderPath?.trim();
      if (!attachmentFolderPath) {
        return normalizedVaultPath;
      }
      const resolved = normalizeAbsolutePath(import_path.default.resolve(normalizedVaultPath, attachmentFolderPath));
      if (!this.isInsideVault(normalizedVaultPath, resolved)) {
        return normalizedVaultPath;
      }
      return resolved;
    } catch {
      return normalizedVaultPath;
    }
  }
  async assertDirectoryExists(directoryPath, label) {
    try {
      const stat = await import_promises.default.stat(directoryPath);
      if (!stat.isDirectory()) {
        throw new Error(`${label} must point to a directory.`);
      }
    } catch (error) {
      const code = error.code;
      if (code === "ENOENT") {
        throw new Error(`${label} does not exist.`);
      }
      throw error;
    }
  }
  assertInsideVault(vaultPath, candidatePath, label) {
    if (!this.isInsideVault(vaultPath, candidatePath)) {
      throw new Error(`${label} must be inside the destination vault.`);
    }
  }
  isInsideVault(vaultPath, candidatePath) {
    const relative = import_path.default.relative(normalizeAbsolutePath(vaultPath), normalizeAbsolutePath(candidatePath));
    return !(relative.startsWith("..") || import_path.default.isAbsolute(relative));
  }
};
var TransferPlanner = class {
  constructor(plugin, destinationResolver) {
    this.plugin = plugin;
    this.destinationResolver = destinationResolver;
  }
  async prepare(selection, target) {
    const sourceVaultRoot = this.getSourceVaultRoot();
    const resolvedTarget = await this.destinationResolver.resolve(target);
    const normalizedSelection = this.normalizeSelection(selection);
    const explicitFiles = this.collectExplicitFiles(normalizedSelection);
    if (explicitFiles.length === 0) {
      throw new Error("The selection does not contain any files to transfer.");
    }
    const explicitMarkdownFiles = explicitFiles.map((entry) => entry.file).filter(isMarkdownFile);
    const reviewRoots = [];
    const directDependencies = /* @__PURE__ */ new Map();
    const directMarkdownRelations = /* @__PURE__ */ new Map();
    const relationshipsCache = /* @__PURE__ */ new Map();
    const getRelationships = (file) => {
      const cached = relationshipsCache.get(file.path);
      if (cached) {
        return cached;
      }
      const relationships = this.collectDirectRelationships(file);
      relationshipsCache.set(file.path, relationships);
      directDependencies.set(file.path, {
        markdown: relationships.markdown,
        attachments: relationships.attachments
      });
      return relationships;
    };
    for (const file of explicitMarkdownFiles) {
      const relationships = getRelationships(file);
      directMarkdownRelations.set(file.path, /* @__PURE__ */ new Set([
        ...relationships.markdown,
        ...relationships.backlinks
      ]));
      const groups = this.createAttachmentGroup(file.path, file.path, getRelationships);
      if (relationships.markdown.size > 0) {
        groups.push({
          id: `${file.path}::to-group`,
          type: "group",
          label: "links to",
          direction: "to",
          children: [...relationships.markdown].sort((left, right) => left.localeCompare(right)).map((notePath) => this.createNoteNode(file.path, "to", notePath, getRelationships))
        });
      }
      if (relationships.backlinks.size > 0) {
        groups.push({
          id: `${file.path}::from-group`,
          type: "group",
          label: "links from",
          direction: "from",
          children: [...relationships.backlinks].sort((left, right) => left.localeCompare(right)).map((notePath) => this.createNoteNode(file.path, "from", notePath, getRelationships))
        });
      }
      reviewRoots.push({
        id: `${file.path}::root`,
        type: "note",
        label: file.basename,
        filePath: file.path,
        children: groups
      });
    }
    return {
      sourceVaultRoot,
      target: resolvedTarget,
      explicitFiles,
      explicitMarkdownPaths: explicitMarkdownFiles.map((file) => file.path),
      selectedFolderPaths: normalizedSelection.filter((entry) => entry instanceof import_obsidian.TFolder).map((folder) => folder.path),
      reviewRoots,
      directDependencies,
      directMarkdownRelations
    };
  }
  normalizeSelection(selection) {
    const unique = /* @__PURE__ */ new Map();
    for (const entry of selection) {
      unique.set((0, import_obsidian.normalizePath)(entry.path), entry);
    }
    const selectedPaths = new Set(unique.keys());
    return [...unique.values()].filter((entry) => !hasSelectedAncestor(entry.path, selectedPaths));
  }
  getSourceVaultRoot() {
    const adapter = this.plugin.app.vault.adapter;
    if (!(adapter instanceof import_obsidian.FileSystemAdapter)) {
      throw new Error("Trans Vault requires a desktop file system adapter.");
    }
    return normalizeAbsolutePath(adapter.getBasePath());
  }
  collectExplicitFiles(selection) {
    const explicitFiles = [];
    for (const entry of selection) {
      if (entry instanceof import_obsidian.TFile) {
        explicitFiles.push({
          file: entry,
          destinationRelativePath: import_path.default.posix.basename((0, import_obsidian.normalizePath)(entry.path))
        });
        continue;
      }
      if (entry instanceof import_obsidian.TFolder) {
        this.collectFolderFiles(entry, entry, explicitFiles);
      }
    }
    return explicitFiles;
  }
  collectFolderFiles(folder, rootFolder, sink) {
    for (const child of folder.children) {
      if (child instanceof import_obsidian.TFile) {
        const relativeInsideRoot = import_path.default.posix.relative((0, import_obsidian.normalizePath)(rootFolder.path), (0, import_obsidian.normalizePath)(child.path));
        sink.push({
          file: child,
          destinationRelativePath: (0, import_obsidian.normalizePath)(import_path.default.posix.join(rootFolder.name, relativeInsideRoot))
        });
      } else if (child instanceof import_obsidian.TFolder) {
        this.collectFolderFiles(child, rootFolder, sink);
      }
    }
  }
  createNoteNode(rootPath, direction, notePath, getRelationships) {
    const file = this.plugin.app.vault.getFileByPath(notePath);
    const children = file && isMarkdownFile(file) ? this.createAttachmentGroup(`${rootPath}::${direction}::${notePath}`, file.path, getRelationships) : [];
    return {
      id: `${rootPath}::${direction}::${notePath}`,
      type: "note",
      label: file?.basename ?? import_path.default.posix.basename(notePath, ".md"),
      filePath: notePath,
      children
    };
  }
  createAttachmentGroup(branchId, notePath, getRelationships) {
    const noteFile = this.plugin.app.vault.getFileByPath(notePath);
    if (!noteFile || !isMarkdownFile(noteFile)) {
      return [];
    }
    const relationships = getRelationships(noteFile);
    if (relationships.attachments.size === 0) {
      return [];
    }
    return [{
      id: `${branchId}::attachments-group`,
      type: "group",
      label: "attachments",
      children: [...relationships.attachments].sort((left, right) => left.localeCompare(right)).map((attachmentPath) => this.createAttachmentNode(branchId, attachmentPath))
    }];
  }
  createAttachmentNode(branchId, attachmentPath) {
    const file = this.plugin.app.vault.getFileByPath(attachmentPath);
    return {
      id: `${branchId}::attachment::${attachmentPath}`,
      type: "attachment",
      label: file?.name ?? import_path.default.posix.basename(attachmentPath),
      filePath: attachmentPath,
      children: []
    };
  }
  collectDirectRelationships(file) {
    const markdown = /* @__PURE__ */ new Set();
    const attachments = /* @__PURE__ */ new Set();
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    for (const ref of [...cache?.links ?? [], ...cache?.embeds ?? [], ...cache?.frontmatterLinks ?? []]) {
      const destination = this.plugin.app.metadataCache.getFirstLinkpathDest((0, import_obsidian.getLinkpath)(ref.link), file.path);
      if (!(destination instanceof import_obsidian.TFile)) {
        continue;
      }
      if (isMarkdownFile(destination)) {
        markdown.add(destination.path);
      } else {
        attachments.add(destination.path);
      }
    }
    const backlinks = /* @__PURE__ */ new Set();
    const resolvedLinks = this.plugin.app.metadataCache.resolvedLinks ?? {};
    for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
      if (!targets[file.path]) {
        continue;
      }
      const sourceFile = this.plugin.app.vault.getFileByPath(sourcePath);
      if (sourceFile && isMarkdownFile(sourceFile)) {
        backlinks.add(sourcePath);
      }
    }
    return {
      markdown,
      backlinks,
      attachments
    };
  }
};
var TransferExecutor = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async execute(plan, mode, confirmedSelectionPaths) {
    const selectedReviewPaths = confirmedSelectionPaths ? new Set(confirmedSelectionPaths) : void 0;
    const selectedMarkdownPaths = selectedReviewPaths ? new Set([...selectedReviewPaths].filter((entry) => this.isSelectedMarkdownPath(entry))) : new Set(plan.explicitMarkdownPaths);
    const draftEntries = /* @__PURE__ */ new Map();
    for (const entry of plan.explicitFiles) {
      if (isMarkdownFile(entry.file) && !selectedMarkdownPaths.has(entry.file.path)) {
        continue;
      }
      draftEntries.set(
        entry.file.path,
        this.createDraftEntry(plan, entry.file, true, entry.destinationRelativePath)
      );
    }
    for (const markdownPath of selectedMarkdownPaths) {
      if (draftEntries.has(markdownPath)) {
        continue;
      }
      const markdownFile = this.plugin.app.vault.getFileByPath(markdownPath);
      if (markdownFile && isMarkdownFile(markdownFile)) {
        draftEntries.set(markdownPath, this.createDraftEntry(plan, markdownFile, false));
      }
    }
    if (selectedReviewPaths) {
      for (const selectedPath of selectedReviewPaths) {
        if (draftEntries.has(selectedPath) || selectedMarkdownPaths.has(selectedPath)) {
          continue;
        }
        const selectedFile = this.plugin.app.vault.getFileByPath(selectedPath);
        if (selectedFile && !isMarkdownFile(selectedFile)) {
          draftEntries.set(selectedPath, this.createDraftEntry(plan, selectedFile, false));
        }
      }
    }
    if (this.plugin.settings.includeLinkedFiles) {
      for (const markdownPath of selectedMarkdownPaths) {
        const dependencies = plan.directDependencies.get(markdownPath);
        if (!dependencies) {
          continue;
        }
        for (const attachmentPath of dependencies.attachments) {
          if (selectedReviewPaths && !selectedReviewPaths.has(attachmentPath)) {
            continue;
          }
          if (draftEntries.has(attachmentPath)) {
            continue;
          }
          const attachmentFile = this.plugin.app.vault.getFileByPath(attachmentPath);
          if (attachmentFile) {
            draftEntries.set(attachmentPath, this.createDraftEntry(plan, attachmentFile, false));
          }
        }
      }
    }
    const summary = {
      requestedFileCount: draftEntries.size,
      transferredFileCount: 0,
      movedFileCount: 0,
      skippedConflictCount: 0,
      renamedCount: 0,
      failedCount: 0,
      skippedEntries: [],
      warnings: []
    };
    const resolvedEntries = await this.resolveConflicts(plan, [...draftEntries.values()], summary);
    const destinationMap = /* @__PURE__ */ new Map();
    for (const entry of resolvedEntries) {
      destinationMap.set(entry.sourceVaultRelativePath, entry.destinationVaultRelativePath);
    }
    const transferredFiles = [];
    for (const entry of resolvedEntries) {
      try {
        await import_promises.default.mkdir(import_path.default.dirname(entry.destinationAbsolutePath), { recursive: true });
        if (entry.overwriteExisting) {
          await import_promises.default.rm(entry.destinationAbsolutePath, { recursive: true, force: true });
        }
        if (entry.shouldRewriteLinks) {
          let content = await this.plugin.app.vault.cachedRead(entry.sourceFile);
          content = this.rewriteMarkdownLinks(content, entry.sourceVaultRelativePath, entry.destinationVaultRelativePath, destinationMap);
          const tagResult = this.applyDestinationTags(content, mode, entry.sourceVaultRelativePath);
          content = tagResult.content;
          if (tagResult.warning) {
            summary.warnings.push(tagResult.warning);
          }
          await import_promises.default.writeFile(entry.destinationAbsolutePath, content, "utf8");
          if (mode === "copy" && this.plugin.settings.alsoTagCopiedSourceElements) {
            const sourceTagResult = await this.tagSourceMarkdown(entry.sourceFile, this.getTagsForMode(mode));
            if (sourceTagResult) {
              summary.warnings.push(sourceTagResult);
            }
          }
        } else {
          await import_promises.default.copyFile(entry.sourceAbsolutePath, entry.destinationAbsolutePath);
        }
        transferredFiles.push(entry.sourceFile);
        summary.transferredFileCount += 1;
        if (entry.wasRenamed) {
          summary.renamedCount += 1;
        }
      } catch (error) {
        summary.failedCount += 1;
        summary.warnings.push(`Failed to transfer ${entry.sourceVaultRelativePath}: ${this.toErrorMessage(error, "Unknown transfer error.")}`);
      }
    }
    if (mode === "move") {
      summary.movedFileCount = await this.deleteMovedSources(transferredFiles, plan.selectedFolderPaths, summary);
    }
    return summary;
  }
  createDraftEntry(plan, file, isExplicitSelection, explicitDestinationRelativePath) {
    const sourceVaultRelativePath = (0, import_obsidian.normalizePath)(file.path);
    const sourceAbsolutePath = normalizeAbsolutePath(import_path.default.join(plan.sourceVaultRoot, ...sourceVaultRelativePath.split("/")));
    const destinationBase = !isExplicitSelection && !isMarkdownFile(file) ? plan.target.effectiveAttachmentPath : plan.target.destinationPath;
    const relativeDestination = explicitDestinationRelativePath ?? import_path.default.posix.basename(sourceVaultRelativePath);
    const destinationAbsolutePath = normalizeAbsolutePath(
      import_path.default.join(destinationBase, ...(0, import_obsidian.normalizePath)(relativeDestination).split("/"))
    );
    return {
      sourceFile: file,
      sourceAbsolutePath,
      sourceVaultRelativePath,
      destinationAbsolutePath,
      destinationVaultRelativePath: toVaultRelativePath(plan.target.vaultPath, destinationAbsolutePath),
      shouldRewriteLinks: isMarkdownFile(file),
      isExplicitSelection,
      wasRenamed: false,
      overwriteExisting: false
    };
  }
  isSelectedMarkdownPath(filePath) {
    const file = this.plugin.app.vault.getFileByPath(filePath);
    return !!file && isMarkdownFile(file);
  }
  async resolveConflicts(plan, entries, summary) {
    const reservedPaths = /* @__PURE__ */ new Set();
    const resolved = [];
    for (const entry of entries) {
      const desiredPath = normalizeAbsolutePath(entry.destinationAbsolutePath);
      const sourcePath = normalizeAbsolutePath(entry.sourceAbsolutePath);
      const alreadyReserved = reservedPaths.has(desiredPath);
      const alreadyExists = await this.pathExists(desiredPath);
      const sourceEqualsDestination = desiredPath === sourcePath;
      const hasConflict = alreadyReserved || alreadyExists || sourceEqualsDestination;
      if (hasConflict && this.plugin.settings.conflictStrategy === "skip") {
        summary.skippedConflictCount += 1;
        summary.skippedEntries.push(entry.sourceVaultRelativePath);
        if (sourceEqualsDestination) {
          summary.warnings.push(`Skipped ${entry.sourceVaultRelativePath} because source and destination are identical.`);
        } else {
          summary.warnings.push(`Skipped ${entry.sourceVaultRelativePath} because ${desiredPath} already exists.`);
        }
        continue;
      }
      let finalPath = desiredPath;
      let wasRenamed = false;
      if (hasConflict && (this.plugin.settings.conflictStrategy === "auto-rename" || alreadyReserved || sourceEqualsDestination)) {
        finalPath = await this.findAvailablePath(desiredPath, reservedPaths, sourcePath);
        wasRenamed = finalPath !== desiredPath;
      }
      reservedPaths.add(finalPath);
      resolved.push({
        ...entry,
        destinationAbsolutePath: finalPath,
        destinationVaultRelativePath: toVaultRelativePath(plan.target.vaultPath, finalPath),
        wasRenamed,
        overwriteExisting: this.plugin.settings.conflictStrategy === "overwrite" && !wasRenamed && alreadyExists
      });
    }
    return resolved;
  }
  rewriteMarkdownLinks(content, sourceVaultRelativePath, destinationVaultRelativePath, destinationMap) {
    let rewritten = content.replace(/(!)?\[\[([^\]]+)\]\]/g, (match, embedPrefix, inner) => {
      const aliasSeparator = inner.indexOf("|");
      const linkText = aliasSeparator >= 0 ? inner.slice(0, aliasSeparator) : inner;
      const alias = aliasSeparator >= 0 ? inner.slice(aliasSeparator + 1) : "";
      const resolved = this.resolveReference(linkText, sourceVaultRelativePath);
      if (!resolved) {
        return match;
      }
      const mappedPath = destinationMap.get(resolved.targetFile.path);
      if (!mappedPath) {
        return match;
      }
      const nextPath = this.toWikiLinkPath(destinationVaultRelativePath, mappedPath, resolved.targetFile.extension);
      const rebuilt = `${nextPath}${resolved.subpath}${alias ? `|${alias}` : ""}`;
      return `${embedPrefix ?? ""}[[${rebuilt}]]`;
    });
    rewritten = rewritten.replace(/(!)?\[([^\]]*)\]\(([^)]+)\)/g, (match, embedPrefix, label, rawHref) => {
      const parsed = this.parseMarkdownHref(rawHref);
      if (!parsed) {
        return match;
      }
      const resolved = this.resolveReference(parsed.path, sourceVaultRelativePath);
      if (!resolved) {
        return match;
      }
      const mappedPath = destinationMap.get(resolved.targetFile.path);
      if (!mappedPath) {
        return match;
      }
      const relativeLink = this.toRelativeLink(destinationVaultRelativePath, mappedPath);
      const rebuiltHref = `${this.encodeMarkdownLinkPath(relativeLink)}${resolved.subpath}`;
      const wrappedHref = parsed.wrappedInAngles ? `<${rebuiltHref}>` : rebuiltHref;
      return `${embedPrefix ?? ""}[${label}](${wrappedHref})`;
    });
    return rewritten;
  }
  resolveReference(linkText, sourceVaultRelativePath) {
    const hashIndex = linkText.indexOf("#");
    const rawPath = hashIndex >= 0 ? linkText.slice(0, hashIndex) : linkText;
    const subpath = hashIndex >= 0 ? linkText.slice(hashIndex) : "";
    const decodedPath = decodeURIComponent(rawPath.trim());
    if (decodedPath.length === 0) {
      return null;
    }
    const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest((0, import_obsidian.getLinkpath)(decodedPath), sourceVaultRelativePath);
    if (!targetFile) {
      return null;
    }
    return { targetFile, subpath };
  }
  parseMarkdownHref(rawHref) {
    const trimmed = rawHref.trim();
    if (trimmed.startsWith("#") || /^[a-z]+:/i.test(trimmed)) {
      return null;
    }
    const wrappedInAngles = trimmed.startsWith("<") && trimmed.endsWith(">") && trimmed.length > 2;
    return {
      path: wrappedInAngles ? trimmed.slice(1, -1) : trimmed,
      wrappedInAngles
    };
  }
  toWikiLinkPath(currentDestination, targetDestination, extension) {
    const relativeLink = this.toRelativeLink(currentDestination, targetDestination);
    return extension.toLowerCase() === "md" ? relativeLink.replace(/\.md$/i, "") : relativeLink;
  }
  toRelativeLink(fromFile, toFile) {
    const relative = (0, import_obsidian.normalizePath)(import_path.default.posix.relative(import_path.default.posix.dirname(fromFile), toFile));
    return relative.length > 0 ? relative : import_path.default.posix.basename(toFile);
  }
  encodeMarkdownLinkPath(linkPath) {
    return encodeURI(linkPath);
  }
  applyDestinationTags(content, mode, sourcePath) {
    const tags = this.getTagsForMode(mode);
    if (tags.length === 0) {
      return { content };
    }
    const result = this.addTagsToMarkdownContent(content, tags);
    if (result.warning) {
      return { content, warning: `Skipped tagging ${sourcePath}: ${result.warning}` };
    }
    return result;
  }
  async tagSourceMarkdown(file, tags) {
    if (!isMarkdownFile(file) || tags.length === 0) {
      return null;
    }
    const currentContent = await this.plugin.app.vault.cachedRead(file);
    const result = this.addTagsToMarkdownContent(currentContent, tags);
    if (result.warning) {
      return `Skipped tagging source file ${file.path}: ${result.warning}`;
    }
    if (result.content !== currentContent) {
      const frontmatterRange = collectFrontmatterRange(currentContent);
      const format = frontmatterRange && frontmatterRange !== "invalid" ? getExistingTagFormatting(frontmatterRange.body) : "unknown";
      try {
        await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
          const mergedTags = joinTagValues(extractExistingTags(frontmatter.tags), tags);
          if (mergedTags.length === 0) {
            delete frontmatter.tags;
            return;
          }
          if (format === "comma") {
            frontmatter.tags = mergedTags.join(", ");
            return;
          }
          if (format === "space") {
            frontmatter.tags = mergedTags.join(" ");
            return;
          }
          if (Array.isArray(frontmatter.tags) || format === "array") {
            frontmatter.tags = mergedTags;
            return;
          }
          if (typeof frontmatter.tags === "string" || format === "string") {
            frontmatter.tags = mergedTags.length === 1 ? mergedTags[0] : mergedTags;
            return;
          }
          frontmatter.tags = mergedTags.length === 1 ? mergedTags[0] : mergedTags;
        });
      } catch {
        return `Skipped tagging source file ${file.path}: invalid frontmatter.`;
      }
    }
    return null;
  }
  addTagsToMarkdownContent(content, tags) {
    const frontmatterRange = collectFrontmatterRange(content);
    if (frontmatterRange === "invalid") {
      return { content, warning: "invalid frontmatter." };
    }
    const buildFrontmatter = (frontmatterBody) => {
      const format = frontmatterBody ? getExistingTagFormatting(frontmatterBody) : "unknown";
      let parsed = {};
      try {
        parsed = frontmatterBody ? (0, import_obsidian.parseYaml)(frontmatterBody) ?? {} : {};
      } catch {
        return { content, warning: "invalid frontmatter." };
      }
      const mergedTags = joinTagValues(extractExistingTags(parsed.tags), tags);
      if (mergedTags.length === 0) {
        return { content };
      }
      if (Array.isArray(parsed.tags)) {
        parsed.tags = mergedTags;
      } else if (typeof parsed.tags === "string") {
        if (format === "comma") {
          parsed.tags = mergedTags.join(", ");
        } else if (format === "space") {
          parsed.tags = mergedTags.join(" ");
        } else {
          parsed.tags = mergedTags.join(" ");
        }
      } else {
        parsed.tags = mergedTags.length === 1 ? mergedTags[0] : mergedTags;
      }
      const yamlBody = (0, import_obsidian.stringifyYaml)(parsed).trimEnd();
      const nextFrontmatter = `---
${yamlBody}
---
`;
      if (!frontmatterRange) {
        return { content: `${nextFrontmatter}${content}` };
      }
      return {
        content: `${nextFrontmatter}${content.slice(frontmatterRange.range[1])}`
      };
    };
    if (!frontmatterRange) {
      return buildFrontmatter(null);
    }
    return buildFrontmatter(frontmatterRange.body);
  }
  getTagsForMode(mode) {
    return cleanTagInput(mode === "copy" ? this.plugin.settings.tagsForCopiedElements : this.plugin.settings.tagsForMovedElements);
  }
  async deleteMovedSources(transferredFiles, selectedFolderPaths, summary) {
    const uniqueFiles = [...new Map(transferredFiles.map((file) => [file.path, file])).values()].sort((left, right) => right.path.length - left.path.length);
    let deletedCount = 0;
    for (const file of uniqueFiles) {
      try {
        const currentFile = this.plugin.app.vault.getFileByPath(file.path);
        if (!currentFile) {
          continue;
        }
        await this.plugin.app.vault.delete(currentFile);
        deletedCount += 1;
      } catch (error) {
        summary.failedCount += 1;
        summary.warnings.push(`Failed to delete source file ${file.path}: ${this.toErrorMessage(error, "Could not delete source file.")}`);
      }
    }
    const sortedFolders = [...selectedFolderPaths].sort((left, right) => right.length - left.length);
    for (const folderPath of sortedFolders) {
      try {
        const folder = this.plugin.app.vault.getFolderByPath(folderPath);
        if (!folder || folder.children.length > 0) {
          continue;
        }
        await this.plugin.app.vault.delete(folder, true);
      } catch (error) {
        summary.warnings.push(`Failed to delete source folder ${folderPath}: ${this.toErrorMessage(error, "Could not delete source folder.")}`);
      }
    }
    return deletedCount;
  }
  async pathExists(candidatePath) {
    try {
      await import_promises.default.access(candidatePath);
      return true;
    } catch {
      return false;
    }
  }
  async findAvailablePath(candidatePath, reservedPaths, sourcePath) {
    const parsed = import_path.default.parse(candidatePath);
    let index = 1;
    let nextPath = candidatePath;
    while (reservedPaths.has(nextPath) || await this.pathExists(nextPath) || nextPath === sourcePath) {
      nextPath = import_path.default.join(parsed.dir, `${parsed.name} ${index}${parsed.ext}`);
      index += 1;
    }
    return nextPath;
  }
  toErrorMessage(error, fallback) {
    return error instanceof Error ? error.message : fallback;
  }
};
var TargetVaultSuggestModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, targets, placeholder, onChooseTarget) {
    super(app);
    this.targets = targets;
    this.onChooseTarget = onChooseTarget;
    this.setPlaceholder(placeholder);
    this.emptyStateText = "No destination vaults available.";
  }
  getItems() {
    return this.targets;
  }
  getItemText(target) {
    return getDestinationDisplayName(target);
  }
  renderSuggestion(match, el) {
    const target = match.item;
    el.createDiv({ cls: "transvault-suggest-title", text: getDestinationDisplayName(target) });
    const detail = [target.vaultPath.trim(), target.destinationPath.trim()].filter((entry) => entry.length > 0).join(" -> ");
    if (detail.length > 0) {
      el.createDiv({ cls: "transvault-suggest-detail", text: detail });
    }
  }
  onChooseItem(target) {
    this.onChooseTarget(target);
  }
};
var ReviewSelectionModal = class extends import_obsidian.Modal {
  constructor(app, roots, conflictStrategy) {
    super(app);
    this.roots = roots;
    this.conflictStrategy = conflictStrategy;
    this.selectionState = /* @__PURE__ */ new Map();
    this.nodeElements = /* @__PURE__ */ new Map();
    this.resolvePromise = null;
    for (const root of roots) {
      this.initializeNodeState(root);
    }
  }
  async waitForResult() {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
  onOpen() {
    this.modalEl.addClass("transvault-review-modal");
    this.titleEl.setText("Review linked notes");
    this.contentEl.empty();
    const conflictNotice = this.contentEl.createDiv({ cls: "transvault-review-conflict-notice" });
    conflictNotice.createSpan({
      cls: "transvault-review-conflict-badge",
      text: `Conflict handling: ${getConflictStrategyLabel(this.conflictStrategy)}`
    });
    conflictNotice.createEl("p", {
      cls: "transvault-review-conflict-text",
      text: getConflictStrategyDescription(this.conflictStrategy)
    });
    this.contentEl.createEl("p", {
      text: "Review direct links and backlinks for the selected Markdown notes. The transfer includes every note instance that remains selected."
    });
    const tree = this.contentEl.createDiv({ cls: "transvault-review-tree" });
    for (const root of this.roots) {
      this.renderNode(tree, root, 0);
    }
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.finish({ confirmed: false, selectedPaths: [] });
    });
    const confirmButton = actions.createEl("button", { text: "Transfer selected items" });
    confirmButton.addClass("mod-cta");
    confirmButton.addEventListener("click", () => {
      this.finish({
        confirmed: true,
        selectedPaths: [...this.getSelectedPaths()].sort((left, right) => left.localeCompare(right))
      });
    });
  }
  onClose() {
    if (this.resolvePromise) {
      this.finish({ confirmed: false, selectedPaths: [] });
    }
  }
  finish(result) {
    const resolve = this.resolvePromise;
    this.resolvePromise = null;
    this.close();
    resolve?.(result);
  }
  initializeNodeState(node) {
    if (node.type === "note" || node.type === "attachment") {
      this.selectionState.set(node.id, true);
    }
    for (const child of node.children) {
      this.initializeNodeState(child);
    }
  }
  renderNode(containerEl, node, depth) {
    const item = containerEl.createDiv({ cls: "transvault-review-node" });
    item.style.setProperty("--transvault-depth", String(depth));
    const row = item.createDiv({ cls: "transvault-review-row" });
    row.addClass(`transvault-review-row-${node.type}`);
    const checkboxShell = row.createSpan({ cls: "transvault-checkbox-shell" });
    const checkbox = checkboxShell.createEl("input", { type: "checkbox" });
    this.nodeElements.set(node.id, checkbox);
    checkbox.addEventListener("change", () => {
      this.toggleNode(node, checkbox.checked);
      this.refreshTree();
    });
    const indicator = checkboxShell.createSpan({ cls: "transvault-check-indicator" });
    const iconEl = row.createSpan({ cls: "transvault-review-icon" });
    if (node.type === "group") {
      if (node.direction) {
        (0, import_obsidian.setIcon)(iconEl, node.direction === "to" ? "links-going-out" : "links-coming-in");
      } else {
        (0, import_obsidian.setIcon)(iconEl, "paperclip");
      }
    } else if (node.type === "attachment") {
      (0, import_obsidian.setIcon)(iconEl, "paperclip");
    } else {
      (0, import_obsidian.setIcon)(iconEl, node.children.length > 0 ? "file-text" : "file");
    }
    const label = row.createSpan({ cls: "transvault-review-label", text: node.label });
    label.addClass(`transvault-review-label-${node.type}`);
    const childrenContainer = item.createDiv({ cls: "transvault-review-children" });
    for (const child of node.children) {
      this.renderNode(childrenContainer, child, depth + 1);
    }
    this.updateCheckbox(node, checkbox, indicator);
  }
  refreshTree() {
    for (const root of this.roots) {
      this.refreshNode(root);
    }
  }
  refreshNode(node) {
    const checkbox = this.nodeElements.get(node.id);
    if (checkbox) {
      const indicator = checkbox.parentElement?.querySelector(".transvault-check-indicator") ?? null;
      if (indicator) {
        this.updateCheckbox(node, checkbox, indicator);
      }
    }
    for (const child of node.children) {
      this.refreshNode(child);
    }
  }
  updateCheckbox(node, checkbox, indicator) {
    const state = this.getNodeStatus(node);
    checkbox.checked = state === "checked";
    checkbox.indeterminate = state === "mixed";
    indicator.textContent = state === "mixed" ? "-" : "";
    indicator.toggleClass("is-visible", state === "mixed");
    checkbox.dataset.state = state;
  }
  getNodeStatus(node) {
    if (node.type === "group") {
      return this.combineStatuses(node.children.map((child) => this.getNodeStatus(child)));
    }
    const selfSelected = this.selectionState.get(node.id) ?? false;
    if (node.children.length === 0) {
      return selfSelected ? "checked" : "unchecked";
    }
    const childStatus = this.combineStatuses(node.children.map((child) => this.getNodeStatus(child)));
    if (selfSelected && childStatus === "checked") {
      return "checked";
    }
    if (!selfSelected && childStatus === "unchecked") {
      return "unchecked";
    }
    return "mixed";
  }
  combineStatuses(statuses) {
    if (statuses.length === 0) {
      return "unchecked";
    }
    if (statuses.every((status) => status === "checked")) {
      return "checked";
    }
    if (statuses.every((status) => status === "unchecked")) {
      return "unchecked";
    }
    return "mixed";
  }
  toggleNode(node, checked) {
    if (node.type === "note" || node.type === "attachment") {
      this.selectionState.set(node.id, checked);
    }
    for (const child of node.children) {
      this.toggleNode(child, checked);
    }
  }
  getSelectedPaths() {
    const selected = /* @__PURE__ */ new Set();
    for (const root of this.roots) {
      this.collectSelectedPaths(root, selected);
    }
    return selected;
  }
  collectSelectedPaths(node, sink) {
    if ((node.type === "note" || node.type === "attachment") && node.filePath && (this.selectionState.get(node.id) ?? false)) {
      sink.add(node.filePath);
    }
    for (const child of node.children) {
      this.collectSelectedPaths(child, sink);
    }
  }
};
var TransVaultSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin, destinationResolver) {
    super(app, plugin);
    this.plugin = plugin;
    this.destinationResolver = destinationResolver;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    this.addDropdownSetting(containerEl, {
      name: "Conflict handling",
      description: "Choose whether existing destination files are skipped, renamed automatically, or overwritten.",
      options: Object.entries(CONFLICT_STRATEGY_METADATA).map(([value, meta]) => ({ value, label: meta.label })),
      value: this.plugin.settings.conflictStrategy,
      onChange: async (value) => {
        this.plugin.settings.conflictStrategy = value;
        await this.plugin.saveSettings();
      }
    });
    this.addToggleSetting(containerEl, {
      name: "Include linked files",
      description: "Include directly related notes and linked non-Markdown files from selected notes.",
      value: this.plugin.settings.includeLinkedFiles,
      onChange: async (value) => {
        this.plugin.settings.includeLinkedFiles = value;
        await this.plugin.saveSettings();
      }
    });
    this.addDropdownSetting(containerEl, {
      name: "Review dialog",
      description: "Choose when to show the transfer review dialog.",
      options: [
        { value: "always", label: "Always" },
        { value: "linked-only", label: "Only when notes are linked" },
        { value: "never", label: "Never" }
      ],
      value: this.plugin.settings.reviewDialogMode,
      onChange: async (value) => {
        this.plugin.settings.reviewDialogMode = value;
        await this.plugin.saveSettings();
      }
    });
    this.addTextSetting(containerEl, {
      name: "Tags for copied notes",
      description: "Comma-separated tags added to transferred Markdown files when copying.",
      placeholder: "copied, sent",
      value: this.plugin.settings.tagsForCopiedElements,
      onChange: async (value) => {
        this.plugin.settings.tagsForCopiedElements = value;
        await this.plugin.saveSettings();
      }
    });
    this.addToggleSetting(containerEl, {
      name: "Also tag copied source notes",
      description: "Write the configured copy tags back into source Markdown files in the active vault.",
      value: this.plugin.settings.alsoTagCopiedSourceElements,
      onChange: async (value) => {
        this.plugin.settings.alsoTagCopiedSourceElements = value;
        await this.plugin.saveSettings();
      }
    });
    this.addTextSetting(containerEl, {
      name: "Tags for moved notes",
      description: "Comma-separated tags added to transferred Markdown files when moving.",
      placeholder: "moved, archived",
      value: this.plugin.settings.tagsForMovedElements,
      onChange: async (value) => {
        this.plugin.settings.tagsForMovedElements = value;
        await this.plugin.saveSettings();
      }
    });
    new import_obsidian.Setting(containerEl).setName("Destination vaults").setHeading();
    containerEl.createEl("p", {
      text: "Use absolute paths. Destination and attachment paths must stay inside the destination vault root."
    });
    for (const target of this.plugin.settings.targets) {
      this.renderDestinationCard(containerEl, target);
    }
    new import_obsidian.Setting(containerEl).setName("Add destination").setDesc("Create another destination vault configuration.").addButton((button) => {
      button.setButtonText("Add destination").setCta().onClick(async () => {
        this.plugin.settings.targets.push(createBlankDestination());
        await this.saveAndRedisplay();
      });
    });
  }
  renderDestinationCard(containerEl, target) {
    const card = containerEl.createDiv({ cls: "transvault-target-card" });
    const validationHost = card.createDiv({ cls: "transvault-target-validation" });
    this.addTextSetting(card, {
      name: "Destination name",
      description: "Label shown in destination selection menus.",
      placeholder: getDestinationDisplayName(target),
      value: target.name,
      onChange: async (value) => {
        target.name = value.trim();
        await this.saveAndRefreshValidation(validationHost, target);
      }
    });
    this.addTextSetting(card, {
      name: "Destination vault path",
      description: "Absolute path to the root of the destination vault.",
      placeholder: this.examplePath("Vault"),
      value: target.vaultPath,
      onChange: async (value) => {
        target.vaultPath = value.trim();
        if (target.useDefaultAttachmentLocation) {
          await this.updateDetectedAttachmentPath(target);
        }
        await this.saveAndRefreshValidation(validationHost, target);
      }
    });
    this.addTextSetting(card, {
      name: "Destination path",
      description: "Absolute path inside the destination vault where copied and moved content will land.",
      placeholder: this.examplePath("Vault/Inbox"),
      value: target.destinationPath,
      onChange: async (value) => {
        target.destinationPath = value.trim();
        await this.saveAndRefreshValidation(validationHost, target);
      }
    });
    this.addToggleSetting(card, {
      name: "Use default attachment location",
      description: "Read .obsidian/app.json in the destination vault and resolve the attachment folder automatically.",
      value: target.useDefaultAttachmentLocation,
      onChange: async (value) => {
        target.useDefaultAttachmentLocation = value;
        if (value) {
          await this.updateDetectedAttachmentPath(target);
        }
        await this.saveAndRedisplay();
      }
    });
    if (!target.useDefaultAttachmentLocation) {
      this.addTextSetting(card, {
        name: "Attachment path",
        description: "Absolute path inside the destination vault for linked non-Markdown files.",
        placeholder: this.examplePath("Vault/Attachments"),
        value: target.attachmentPath,
        onChange: async (value) => {
          target.attachmentPath = value.trim();
          await this.saveAndRefreshValidation(validationHost, target);
        }
      });
    }
    this.renderValidation(validationHost, target);
    new import_obsidian.Setting(card).addButton((button) => {
      button.setButtonText("Remove").setWarning().onClick(async () => {
        this.plugin.settings.targets = this.plugin.settings.targets.filter((entry) => entry.id !== target.id);
        await this.saveAndRedisplay();
      });
    });
  }
  addTextSetting(containerEl, config) {
    new import_obsidian.Setting(containerEl).setName(config.name).setDesc(config.description).addText((text) => {
      text.setPlaceholder(config.placeholder).setValue(config.value).onChange(config.onChange);
    });
  }
  addToggleSetting(containerEl, config) {
    new import_obsidian.Setting(containerEl).setName(config.name).setDesc(config.description).addToggle((toggle) => {
      toggle.setValue(config.value).onChange(config.onChange);
    });
  }
  addDropdownSetting(containerEl, config) {
    new import_obsidian.Setting(containerEl).setName(config.name).setDesc(config.description).addDropdown((dropdown) => {
      for (const option of config.options) {
        dropdown.addOption(option.value, option.label);
      }
      dropdown.setValue(config.value).onChange((value) => config.onChange(value));
    });
  }
  async saveAndRedisplay() {
    await this.plugin.saveSettings();
    this.display();
  }
  async saveAndRefreshValidation(containerEl, target) {
    await this.plugin.saveSettings();
    this.renderValidation(containerEl, target);
  }
  renderValidation(containerEl, target) {
    containerEl.empty();
    const errors = this.destinationResolver.validate(target);
    if (errors.length === 0) {
      if (target.useDefaultAttachmentLocation && target.attachmentPath.trim().length > 0) {
        containerEl.createEl("small", { text: `Detected attachment path: ${target.attachmentPath.trim()}` });
      }
      return;
    }
    for (const error of errors) {
      containerEl.createEl("small", { text: error });
    }
  }
  async updateDetectedAttachmentPath(target) {
    const normalizedVaultPath = normalizeConfiguredPathInput(target.vaultPath);
    if (!import_path.default.isAbsolute(normalizedVaultPath)) {
      return;
    }
    target.attachmentPath = await this.destinationResolver.resolveDefaultAttachmentPath(normalizedVaultPath);
  }
  examplePath(suffix) {
    return process.platform === "win32" ? `C:\\${suffix.replace(/\//g, "\\")}` : `/Users/example/${suffix.replace(/\\/g, "/")}`;
  }
};
var TransVaultPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.destinationResolver = new DestinationResolver();
    this.planner = new TransferPlanner(this, this.destinationResolver);
    this.executor = new TransferExecutor(this);
    this.notebookNavigatorMenusRegistered = false;
    this.notebookNavigatorRetryIntervalId = null;
  }
  async onload() {
    if (!import_obsidian.Platform.isDesktopApp) {
      new import_obsidian.Notice("Trans Vault is available only on desktop.", 1e4);
      return;
    }
    await this.loadSettings();
    this.addSettingTab(new TransVaultSettingTab(this.app, this, this.destinationResolver));
    this.registerCommands();
    this.registerContextMenus();
    this.registerNotebookNavigatorIntegration();
  }
  async loadSettings() {
    const stored = await this.loadData();
    const migratedReviewDialogMode = stored?.reviewDialogMode ?? (typeof stored?.showReviewDialog === "boolean" ? stored.showReviewDialog ? "linked-only" : "never" : void 0);
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      reviewDialogMode: migratedReviewDialogMode ?? DEFAULT_SETTINGS.reviewDialogMode,
      targets: (stored?.targets ?? []).map((target) => ({
        ...createBlankDestination(),
        ...target,
        id: target.id ?? createDestinationId()
      }))
    };
    for (const target of this.settings.targets) {
      const normalizedVaultPath = normalizeConfiguredPathInput(target.vaultPath);
      if (target.useDefaultAttachmentLocation && import_path.default.isAbsolute(normalizedVaultPath)) {
        target.attachmentPath = await this.destinationResolver.resolveDefaultAttachmentPath(normalizedVaultPath);
      }
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  registerCommands() {
    this.addCommand({
      id: "copy-active-file-to-vault",
      name: TRANSFER_MODE_METADATA.copy.commandName,
      checkCallback: (checking) => this.handleActiveFileCommand("copy", checking)
    });
    this.addCommand({
      id: "move-active-file-to-vault",
      name: TRANSFER_MODE_METADATA.move.commandName,
      checkCallback: (checking) => this.handleActiveFileCommand("move", checking)
    });
  }
  handleActiveFileCommand(mode, checking) {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return false;
    }
    if (checking) {
      return true;
    }
    this.openTargetModal(mode, [activeFile]);
    return true;
  }
  registerContextMenus() {
    const workspace = this.app.workspace;
    this.registerEvent(workspace.on("file-menu", (menu, file) => {
      this.addTransferMenuItems(menu, [file]);
    }));
    this.registerEvent(workspace.on("files-menu", (menu, files) => {
      this.addTransferMenuItems(menu, files);
    }));
  }
  registerNotebookNavigatorIntegration() {
    this.tryRegisterNotebookNavigatorMenus();
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.tryRegisterNotebookNavigatorMenus();
    }));
    if (!this.notebookNavigatorMenusRegistered) {
      this.notebookNavigatorRetryIntervalId = window.setInterval(() => {
        this.tryRegisterNotebookNavigatorMenus();
      }, 2e3);
      this.registerInterval(this.notebookNavigatorRetryIntervalId);
    }
  }
  tryRegisterNotebookNavigatorMenus() {
    if (this.notebookNavigatorMenusRegistered) {
      return;
    }
    const notebookNavigator = this.app.plugins?.plugins?.["notebook-navigator"]?.api;
    if (!notebookNavigator?.menus) {
      return;
    }
    const disposeFileMenu = notebookNavigator.menus.registerFileMenu?.((context) => {
      const selection = Array.isArray(context.selection?.files) ? context.selection.files : [context.file];
      this.addTransferMenuItemsToExternalMenu(context.addItem, selection);
    });
    if (typeof disposeFileMenu === "function") {
      this.register(disposeFileMenu);
    }
    const disposeFolderMenu = notebookNavigator.menus.registerFolderMenu?.((context) => {
      this.addTransferMenuItemsToExternalMenu(context.addItem, [context.folder]);
    });
    if (typeof disposeFolderMenu === "function") {
      this.register(disposeFolderMenu);
    }
    this.notebookNavigatorMenusRegistered = true;
    if (this.notebookNavigatorRetryIntervalId !== null) {
      window.clearInterval(this.notebookNavigatorRetryIntervalId);
      this.notebookNavigatorRetryIntervalId = null;
    }
  }
  addTransferMenuItems(menu, selection) {
    const normalizedSelection = this.planner.normalizeSelection(selection);
    if (normalizedSelection.length === 0) {
      return;
    }
    this.addModeMenuItem(menu, normalizedSelection, "copy");
    this.addModeMenuItem(menu, normalizedSelection, "move");
  }
  addTransferMenuItemsToExternalMenu(addItem, selection) {
    const normalizedSelection = this.planner.normalizeSelection(selection);
    if (normalizedSelection.length === 0) {
      return;
    }
    this.addModeMenuItemToExternalMenu(addItem, normalizedSelection, "copy");
    this.addModeMenuItemToExternalMenu(addItem, normalizedSelection, "move");
  }
  addModeMenuItem(menu, selection, mode) {
    menu.addItem((item) => {
      this.configureTransferMenuItem(item, selection, mode);
    });
  }
  addModeMenuItemToExternalMenu(addItem, selection, mode) {
    addItem((item) => {
      this.configureTransferMenuItem(item, selection, mode);
    });
  }
  configureTransferMenuItem(item, selection, mode) {
    const metadata = TRANSFER_MODE_METADATA[mode];
    item.setTitle(metadata.menuTitle).setIcon(metadata.icon);
    const selectableTargets = this.getSelectableTargets();
    if (selectableTargets.length === 0) {
      item.setDisabled(true);
      return;
    }
    item.onClick(() => {
      this.openTargetModal(mode, selection);
    });
  }
  openTargetModal(mode, selection) {
    const targets = this.getSelectableTargets();
    if (targets.length === 0) {
      new import_obsidian.Notice("Add a destination vault first.", 8e3);
      return;
    }
    const title = TRANSFER_MODE_METADATA[mode].targetModalTitle;
    new TargetVaultSuggestModal(this.app, targets, title, (target) => {
      void this.runTransfer(mode, selection, target);
    }).open();
  }
  getSelectableTargets() {
    return this.settings.targets.filter((target) => target.name.trim().length > 0);
  }
  async runTransfer(mode, selection, target) {
    try {
      const plan = await this.planner.prepare(selection, target);
      const confirmedSelectionPaths = await this.maybeReviewPlan(plan);
      if (confirmedSelectionPaths === null) {
        return;
      }
      const summary = await this.executor.execute(plan, mode, confirmedSelectionPaths);
      this.showTransferSummaryNotice(mode, summary);
    } catch (error) {
      new import_obsidian.Notice(error instanceof Error ? error.message : "Couldn't complete the transfer.", 12e3);
    }
  }
  async maybeReviewPlan(plan) {
    const hasReviewableSelection = plan.explicitMarkdownPaths.length > 0;
    const hasRelevantRelationships = plan.reviewRoots.some((root) => root.children.length > 0);
    if (!hasReviewableSelection || this.settings.reviewDialogMode === "never") {
      return void 0;
    }
    if (this.settings.reviewDialogMode === "linked-only" && !hasRelevantRelationships) {
      return void 0;
    }
    const result = await new ReviewSelectionModal(this.app, plan.reviewRoots, this.settings.conflictStrategy).waitForResult();
    if (!result.confirmed) {
      return null;
    }
    return result.selectedPaths;
  }
  showTransferSummaryNotice(mode, summary) {
    const completedCount = mode === "copy" ? summary.transferredFileCount : summary.movedFileCount;
    const action = mode === "copy" ? "Copy complete" : "Move complete";
    const parts = [`${completedCount} of ${summary.requestedFileCount} items transferred`];
    if (summary.renamedCount > 0) {
      parts.push(formatCount(summary.renamedCount, "item renamed", "items renamed"));
    }
    if (summary.skippedConflictCount > 0) {
      parts.push(formatCount(summary.skippedConflictCount, "item skipped", "items skipped"));
    }
    if (summary.failedCount > 0) {
      parts.push(formatCount(summary.failedCount, "item failed", "items failed"));
    }
    if (summary.warnings.length > 0 && summary.skippedConflictCount === 0) {
      parts.push(formatCount(summary.warnings.length, "warning", "warnings"));
    }
    if (summary.skippedConflictCount > 0) {
      const fragment = document.createDocumentFragment();
      const container = document.createElement("div");
      container.className = "transvault-skip-notice";
      const title = document.createElement("div");
      title.className = "transvault-skip-notice-title";
      title.textContent = `${action} with warnings: ${parts.join(", ")}.`;
      container.appendChild(title);
      const shownEntries = summary.skippedEntries.slice(0, 10);
      const list = document.createElement("ul");
      list.className = "transvault-skip-notice-list";
      for (const skipped of shownEntries) {
        const row = document.createElement("li");
        row.textContent = skipped;
        list.appendChild(row);
      }
      container.appendChild(list);
      if (summary.skippedEntries.length > shownEntries.length) {
        const more = document.createElement("div");
        more.className = "transvault-skip-notice-more";
        more.textContent = `... and ${formatCount(summary.skippedEntries.length - shownEntries.length, "more skipped item", "more skipped items")}.`;
        container.appendChild(more);
      }
      const dismissHint = document.createElement("div");
      dismissHint.className = "transvault-skip-notice-dismiss";
      dismissHint.textContent = "Click to dismiss";
      container.appendChild(dismissHint);
      fragment.appendChild(container);
      const notice = new import_obsidian.Notice(fragment, 0);
      notice.noticeEl?.addClass("transvault-notice-clickable");
      notice.noticeEl?.addEventListener("click", () => {
        notice.hide?.();
      });
      return;
    }
    new import_obsidian.Notice(`${action}: ${parts.join(", ")}.`, 1e4);
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0IG9zIGZyb20gXCJvc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7XG4gIEFwcCxcbiAgRmlsZVN5c3RlbUFkYXB0ZXIsXG4gIEZ1enp5TWF0Y2gsXG4gIEZ1enp5U3VnZ2VzdE1vZGFsLFxuICBNZW51LFxuICBNZW51SXRlbSxcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGxhdGZvcm0sXG4gIFBsdWdpbixcbiAgUGx1Z2luU2V0dGluZ1RhYixcbiAgU2V0dGluZyxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFRGb2xkZXIsXG4gIGdldExpbmtwYXRoLFxuICBub3JtYWxpemVQYXRoLFxuICBwYXJzZVlhbWwsXG4gIHNldEljb24sXG4gIHN0cmluZ2lmeVlhbWwsXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG50eXBlIFRyYW5zZmVyTW9kZSA9IFwiY29weVwiIHwgXCJtb3ZlXCI7XG50eXBlIENvbmZsaWN0U3RyYXRlZ3kgPSBcInNraXBcIiB8IFwiYXV0by1yZW5hbWVcIiB8IFwib3ZlcndyaXRlXCI7XG50eXBlIFJldmlld0RpcmVjdGlvbiA9IFwidG9cIiB8IFwiZnJvbVwiO1xudHlwZSBSZXZpZXdOb2RlVHlwZSA9IFwibm90ZVwiIHwgXCJncm91cFwiIHwgXCJhdHRhY2htZW50XCI7XG50eXBlIFJldmlld0RpYWxvZ01vZGUgPSBcImFsd2F5c1wiIHwgXCJsaW5rZWQtb25seVwiIHwgXCJuZXZlclwiO1xuXG5pbnRlcmZhY2UgRGVzdGluYXRpb25Db25maWcge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHZhdWx0UGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvblBhdGg6IHN0cmluZztcbiAgdXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbjogYm9vbGVhbjtcbiAgYXR0YWNobWVudFBhdGg6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFRyYW5zVmF1bHRTZXR0aW5ncyB7XG4gIGNvbmZsaWN0U3RyYXRlZ3k6IENvbmZsaWN0U3RyYXRlZ3k7XG4gIGluY2x1ZGVMaW5rZWRGaWxlczogYm9vbGVhbjtcbiAgcmV2aWV3RGlhbG9nTW9kZTogUmV2aWV3RGlhbG9nTW9kZTtcbiAgdGFnc0ZvckNvcGllZEVsZW1lbnRzOiBzdHJpbmc7XG4gIGFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50czogYm9vbGVhbjtcbiAgdGFnc0Zvck1vdmVkRWxlbWVudHM6IHN0cmluZztcbiAgdGFyZ2V0czogRGVzdGluYXRpb25Db25maWdbXTtcbn1cblxuaW50ZXJmYWNlIFJldmlld05vZGUge1xuICBpZDogc3RyaW5nO1xuICB0eXBlOiBSZXZpZXdOb2RlVHlwZTtcbiAgbGFiZWw6IHN0cmluZztcbiAgZmlsZVBhdGg/OiBzdHJpbmc7XG4gIGRpcmVjdGlvbj86IFJldmlld0RpcmVjdGlvbjtcbiAgY2hpbGRyZW46IFJldmlld05vZGVbXTtcbn1cblxuaW50ZXJmYWNlIERpcmVjdERlcGVuZGVuY2llcyB7XG4gIG1hcmtkb3duOiBTZXQ8c3RyaW5nPjtcbiAgYXR0YWNobWVudHM6IFNldDxzdHJpbmc+O1xufVxuXG5pbnRlcmZhY2UgRGlyZWN0UmVsYXRpb25zaGlwcyBleHRlbmRzIERpcmVjdERlcGVuZGVuY2llcyB7XG4gIGJhY2tsaW5rczogU2V0PHN0cmluZz47XG59XG5cbmludGVyZmFjZSBFeHBsaWNpdEZpbGVTZWxlY3Rpb24ge1xuICBmaWxlOiBURmlsZTtcbiAgZGVzdGluYXRpb25SZWxhdGl2ZVBhdGg6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFJlc29sdmVkRGVzdGluYXRpb25Db25maWcgZXh0ZW5kcyBEZXN0aW5hdGlvbkNvbmZpZyB7XG4gIHZhdWx0UGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvblBhdGg6IHN0cmluZztcbiAgZWZmZWN0aXZlQXR0YWNobWVudFBhdGg6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFByZXBhcmVkVHJhbnNmZXJQbGFuIHtcbiAgc291cmNlVmF1bHRSb290OiBzdHJpbmc7XG4gIHRhcmdldDogUmVzb2x2ZWREZXN0aW5hdGlvbkNvbmZpZztcbiAgZXhwbGljaXRGaWxlczogRXhwbGljaXRGaWxlU2VsZWN0aW9uW107XG4gIGV4cGxpY2l0TWFya2Rvd25QYXRoczogc3RyaW5nW107XG4gIHNlbGVjdGVkRm9sZGVyUGF0aHM6IHN0cmluZ1tdO1xuICByZXZpZXdSb290czogUmV2aWV3Tm9kZVtdO1xuICBkaXJlY3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIERpcmVjdERlcGVuZGVuY2llcz47XG4gIGRpcmVjdE1hcmtkb3duUmVsYXRpb25zOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj47XG59XG5cbmludGVyZmFjZSBEcmFmdFRyYW5zZmVyRW50cnkge1xuICBzb3VyY2VGaWxlOiBURmlsZTtcbiAgc291cmNlQWJzb2x1dGVQYXRoOiBzdHJpbmc7XG4gIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIGRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoOiBzdHJpbmc7XG4gIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZztcbiAgc2hvdWxkUmV3cml0ZUxpbmtzOiBib29sZWFuO1xuICBpc0V4cGxpY2l0U2VsZWN0aW9uOiBib29sZWFuO1xuICB3YXNSZW5hbWVkOiBib29sZWFuO1xuICBvdmVyd3JpdGVFeGlzdGluZzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEZpbmFsaXplZFRyYW5zZmVyRW50cnkgZXh0ZW5kcyBEcmFmdFRyYW5zZmVyRW50cnkge31cblxuaW50ZXJmYWNlIFRyYW5zZmVyU3VtbWFyeSB7XG4gIHJlcXVlc3RlZEZpbGVDb3VudDogbnVtYmVyO1xuICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogbnVtYmVyO1xuICBtb3ZlZEZpbGVDb3VudDogbnVtYmVyO1xuICBza2lwcGVkQ29uZmxpY3RDb3VudDogbnVtYmVyO1xuICByZW5hbWVkQ291bnQ6IG51bWJlcjtcbiAgZmFpbGVkQ291bnQ6IG51bWJlcjtcbiAgc2tpcHBlZEVudHJpZXM6IHN0cmluZ1tdO1xuICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBSZXZpZXdNb2RhbFJlc3VsdCB7XG4gIGNvbmZpcm1lZDogYm9vbGVhbjtcbiAgc2VsZWN0ZWRQYXRoczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgd2FybmluZz86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBhcnNlZE1hcmtkb3duSHJlZiB7XG4gIHBhdGg6IHN0cmluZztcbiAgd3JhcHBlZEluQW5nbGVzOiBib29sZWFuO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBUcmFuc1ZhdWx0U2V0dGluZ3MgPSB7XG4gIGNvbmZsaWN0U3RyYXRlZ3k6IFwic2tpcFwiLFxuICBpbmNsdWRlTGlua2VkRmlsZXM6IHRydWUsXG4gIHJldmlld0RpYWxvZ01vZGU6IFwiYWx3YXlzXCIsXG4gIHRhZ3NGb3JDb3BpZWRFbGVtZW50czogXCJcIixcbiAgYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzOiBmYWxzZSxcbiAgdGFnc0Zvck1vdmVkRWxlbWVudHM6IFwiXCIsXG4gIHRhcmdldHM6IFtdLFxufTtcblxuY29uc3QgVFJBTlNGRVJfTU9ERV9NRVRBREFUQTogUmVjb3JkPFRyYW5zZmVyTW9kZSwge1xuICBtZW51VGl0bGU6IHN0cmluZztcbiAgY29tbWFuZE5hbWU6IHN0cmluZztcbiAgdGFyZ2V0TW9kYWxUaXRsZTogc3RyaW5nO1xuICBpY29uOiBzdHJpbmc7XG59PiA9IHtcbiAgY29weToge1xuICAgIG1lbnVUaXRsZTogXCJDb3B5IHRvIHZhdWx0Li4uXCIsXG4gICAgY29tbWFuZE5hbWU6IFwiQ29weSBhY3RpdmUgZmlsZSB0byB2YXVsdC4uLlwiLFxuICAgIHRhcmdldE1vZGFsVGl0bGU6IFwiQ2hvb3NlIGEgdmF1bHQgdG8gY29weSB0b1wiLFxuICAgIGljb246IFwiY29weS1wbHVzXCIsXG4gIH0sXG4gIG1vdmU6IHtcbiAgICBtZW51VGl0bGU6IFwiTW92ZSB0byB2YXVsdC4uLlwiLFxuICAgIGNvbW1hbmROYW1lOiBcIk1vdmUgYWN0aXZlIGZpbGUgdG8gdmF1bHQuLi5cIixcbiAgICB0YXJnZXRNb2RhbFRpdGxlOiBcIkNob29zZSBhIHZhdWx0IHRvIG1vdmUgdG9cIixcbiAgICBpY29uOiBcImZvbGRlci1zeW1saW5rXCIsXG4gIH0sXG59O1xuXG5jb25zdCBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQTogUmVjb3JkPENvbmZsaWN0U3RyYXRlZ3ksIHtcbiAgbGFiZWw6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbn0+ID0ge1xuICBza2lwOiB7XG4gICAgbGFiZWw6IFwiU2tpcFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIHdpbGwgYmUgc2tpcHBlZCBkdXJpbmcgdHJhbnNmZXIuXCIsXG4gIH0sXG4gIFwiYXV0by1yZW5hbWVcIjoge1xuICAgIGxhYmVsOiBcIkF1dG8tcmVuYW1lXCIsXG4gICAgZGVzY3JpcHRpb246IFwiRXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgd2lsbCBiZSBrZXB0LCBhbmQgbmV3IGNvcGllcyB3aWxsIGJlIHJlbmFtZWQgYXV0b21hdGljYWxseS5cIixcbiAgfSxcbiAgb3ZlcndyaXRlOiB7XG4gICAgbGFiZWw6IFwiT3ZlcndyaXRlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiRXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdHJhbnNmZXIuXCIsXG4gIH0sXG59O1xuXG5mdW5jdGlvbiBjcmVhdGVEZXN0aW5hdGlvbklkKCk6IHN0cmluZyB7XG4gIHJldHVybiBgZGVzdGluYXRpb24tJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDgpfWA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJsYW5rRGVzdGluYXRpb24oKTogRGVzdGluYXRpb25Db25maWcge1xuICByZXR1cm4ge1xuICAgIGlkOiBjcmVhdGVEZXN0aW5hdGlvbklkKCksXG4gICAgbmFtZTogXCJcIixcbiAgICB2YXVsdFBhdGg6IFwiXCIsXG4gICAgZGVzdGluYXRpb25QYXRoOiBcIlwiLFxuICAgIHVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb246IHRydWUsXG4gICAgYXR0YWNobWVudFBhdGg6IFwiXCIsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWROYW1lID0gdGFyZ2V0Lm5hbWUudHJpbSgpO1xuICBpZiAodHJpbW1lZE5hbWUubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiB0cmltbWVkTmFtZTtcbiAgfVxuICBjb25zdCB0cmltbWVkVmF1bHRQYXRoID0gdGFyZ2V0LnZhdWx0UGF0aC50cmltKCk7XG4gIGlmICh0cmltbWVkVmF1bHRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBcIlVubmFtZWQgZGVzdGluYXRpb25cIjtcbiAgfVxuICBjb25zdCBwYXJ0cyA9IHRyaW1tZWRWYXVsdFBhdGguc3BsaXQoL1svXFxcXF0rLykuZmlsdGVyKEJvb2xlYW4pO1xuICByZXR1cm4gcGFydHMuYXQoLTEpID8/IHRyaW1tZWRWYXVsdFBhdGg7XG59XG5cbmZ1bmN0aW9uIGdldENvbmZsaWN0U3RyYXRlZ3lMYWJlbChzdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSk6IHN0cmluZyB7XG4gIHJldHVybiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtzdHJhdGVneV0ubGFiZWw7XG59XG5cbmZ1bmN0aW9uIGdldENvbmZsaWN0U3RyYXRlZ3lEZXNjcmlwdGlvbihzdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSk6IHN0cmluZyB7XG4gIHJldHVybiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtzdHJhdGVneV0uZGVzY3JpcHRpb247XG59XG5cbmZ1bmN0aW9uIGZvcm1hdENvdW50KGNvdW50OiBudW1iZXIsIHNpbmd1bGFyOiBzdHJpbmcsIHBsdXJhbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2NvdW50fSAke2NvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWx9YDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5ub3JtYWxpemUocGF0aC5yZXNvbHZlKHZhbHVlKSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpO1xuICBpZiAoXG4gICAgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aCgnXCInKSAmJiBub3JtYWxpemVkLmVuZHNXaXRoKCdcIicpKVxuICAgIHx8IChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vcm1hbGl6ZWQuZW5kc1dpdGgoXCInXCIpKVxuICApIHtcbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5zbGljZSgxLCAtMSkudHJpbSgpO1xuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcIndpbjMyXCIpIHtcbiAgICBpZiAobm9ybWFsaXplZCA9PT0gXCJ+XCIpIHtcbiAgICAgIG5vcm1hbGl6ZWQgPSBvcy5ob21lZGlyKCk7XG4gICAgfSBlbHNlIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCJ+L1wiKSkge1xuICAgICAgbm9ybWFsaXplZCA9IHBhdGguam9pbihvcy5ob21lZGlyKCksIG5vcm1hbGl6ZWQuc2xpY2UoMikpO1xuICAgIH0gZWxzZSBpZiAobm9ybWFsaXplZC5zdGFydHNXaXRoKFwiJEhPTUUvXCIpKSB7XG4gICAgICBub3JtYWxpemVkID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgbm9ybWFsaXplZC5zbGljZShcIiRIT01FL1wiLmxlbmd0aCkpO1xuICAgIH1cbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5yZXBsYWNlKC9cXFxcKFsgISMkJicoKSo7PD4/QFtcXF1eYHt8fX5dKS9nLCBcIiQxXCIpO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVBYnNvbHV0ZVBhdGgodmFsdWU6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWQgPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHZhbHVlKTtcbiAgaWYgKHRyaW1tZWQubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBpcyByZXF1aXJlZC5gKTtcbiAgfVxuICBpZiAoIXBhdGguaXNBYnNvbHV0ZSh0cmltbWVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbXVzdCBiZSBhbiBhYnNvbHV0ZSBwYXRoLmApO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVBYnNvbHV0ZVBhdGgodHJpbW1lZCk7XG59XG5cbmZ1bmN0aW9uIHRvVmF1bHRSZWxhdGl2ZVBhdGgodmF1bHRSb290OiBzdHJpbmcsIGFic29sdXRlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5vcm1hbGl6ZVBhdGgocGF0aC5yZWxhdGl2ZSh2YXVsdFJvb3QsIGFic29sdXRlUGF0aCkuc3BsaXQocGF0aC5zZXApLmpvaW4oXCIvXCIpKTtcbn1cblxuZnVuY3Rpb24gY2xlYW5UYWdJbnB1dCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoXCIsXCIpXG4gICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAuZmlsdGVyKChlbnRyeSwgaW5kZXgsIGl0ZW1zKSA9PiBlbnRyeS5sZW5ndGggPiAwICYmIGl0ZW1zLmluZGV4T2YoZW50cnkpID09PSBpbmRleCk7XG59XG5cbmZ1bmN0aW9uIGpvaW5UYWdWYWx1ZXMoZXhpc3Rpbmc6IHN0cmluZ1tdLCBhZGRpdGlvbnM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICBjb25zdCBub3JtYWxpemVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgdGFnIG9mIFsuLi5leGlzdGluZywgLi4uYWRkaXRpb25zXSkge1xuICAgIGNvbnN0IGNsZWFuID0gdGFnLnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKTtcbiAgICBpZiAoY2xlYW4ubGVuZ3RoID4gMCkge1xuICAgICAgbm9ybWFsaXplZC5hZGQoY2xlYW4pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gWy4uLm5vcm1hbGl6ZWRdO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0RnJvbnRtYXR0ZXJSYW5nZShjb250ZW50OiBzdHJpbmcpOiB7IHJhbmdlOiBbbnVtYmVyLCBudW1iZXJdOyBib2R5OiBzdHJpbmcgfSB8IG51bGwgfCBcImludmFsaWRcIiB7XG4gIGlmICghY29udGVudC5zdGFydHNXaXRoKFwiLS0tXFxuXCIpICYmICFjb250ZW50LnN0YXJ0c1dpdGgoXCItLS1cXHJcXG5cIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBtYXRjaGVyID0gL14tLS1cXHI/XFxuKFtcXHNcXFNdKj8pXFxyP1xcbi0tLVxccj9cXG4/LztcbiAgY29uc3QgbWF0Y2ggPSBjb250ZW50Lm1hdGNoKG1hdGNoZXIpO1xuICBpZiAoIW1hdGNoIHx8IG1hdGNoLmluZGV4ICE9PSAwKSB7XG4gICAgcmV0dXJuIFwiaW52YWxpZFwiO1xuICB9XG4gIHJldHVybiB7XG4gICAgcmFuZ2U6IFswLCBtYXRjaFswXS5sZW5ndGhdLFxuICAgIGJvZHk6IG1hdGNoWzFdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJCb2R5OiBzdHJpbmcpOiBcImFycmF5XCIgfCBcImNvbW1hXCIgfCBcInNwYWNlXCIgfCBcInN0cmluZ1wiIHwgXCJ1bmtub3duXCIge1xuICBjb25zdCB0YWdzTGluZSA9IGZyb250bWF0dGVyQm9keS5tYXRjaCgvXnRhZ3M6XFxzKiguKykkL20pO1xuICBpZiAoIXRhZ3NMaW5lKSB7XG4gICAgaWYgKC9edGFnczpcXHMqJC9tLnRlc3QoZnJvbnRtYXR0ZXJCb2R5KSB8fCAvXnRhZ3M6XFxzKlxccj9cXG4vbS50ZXN0KGZyb250bWF0dGVyQm9keSkpIHtcbiAgICAgIHJldHVybiBcImFycmF5XCI7XG4gICAgfVxuICAgIHJldHVybiBcInVua25vd25cIjtcbiAgfVxuICBjb25zdCB2YWx1ZSA9IHRhZ3NMaW5lWzFdLnRyaW0oKTtcbiAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoXCJbXCIpKSB7XG4gICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgfVxuICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpKSB7XG4gICAgcmV0dXJuIFwiY29tbWFcIjtcbiAgfVxuICBpZiAoL1xccy8udGVzdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gXCJzcGFjZVwiO1xuICB9XG4gIHJldHVybiBcInN0cmluZ1wiO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0RXhpc3RpbmdUYWdzKHZhbHVlOiB1bmtub3duKTogc3RyaW5nW10ge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgIC5tYXAoKGVudHJ5KSA9PiAodHlwZW9mIGVudHJ5ID09PSBcInN0cmluZ1wiID8gZW50cnkgOiBTdHJpbmcoZW50cnkgPz8gXCJcIikpKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3Qgc2VwYXJhdG9yID0gdmFsdWUuaW5jbHVkZXMoXCIsXCIpID8gXCIsXCIgOiAvXFxzKy87XG4gICAgcmV0dXJuIHZhbHVlXG4gICAgICAuc3BsaXQoc2VwYXJhdG9yKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKTtcbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIGlzTWFya2Rvd25GaWxlKGZpbGU6IFRGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpID09PSBcIm1kXCI7XG59XG5cbmZ1bmN0aW9uIGhhc1NlbGVjdGVkQW5jZXN0b3IoZmlsZVBhdGg6IHN0cmluZywgc2VsZWN0ZWRQYXRoczogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoKS5zcGxpdChcIi9cIik7XG4gIGZvciAobGV0IGluZGV4ID0gMTsgaW5kZXggPCBwYXJ0cy5sZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBpZiAoc2VsZWN0ZWRQYXRocy5oYXMocGFydHMuc2xpY2UoMCwgaW5kZXgpLmpvaW4oXCIvXCIpKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuY2xhc3MgRGVzdGluYXRpb25SZXNvbHZlciB7XG4gIGFzeW5jIHJlc29sdmUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8UmVzb2x2ZWREZXN0aW5hdGlvbkNvbmZpZz4ge1xuICAgIGNvbnN0IHZhdWx0UGF0aCA9IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQudmF1bHRQYXRoLCBcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGhcIik7XG4gICAgY29uc3QgZGVzdGluYXRpb25QYXRoID0gZW5zdXJlQWJzb2x1dGVQYXRoKHRhcmdldC5kZXN0aW5hdGlvblBhdGgsIFwiRGVzdGluYXRpb24gcGF0aFwiKTtcbiAgICBjb25zdCBlZmZlY3RpdmVBdHRhY2htZW50UGF0aCA9IHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uXG4gICAgICA/IGF3YWl0IHRoaXMucmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aCh2YXVsdFBhdGgpXG4gICAgICA6IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQuYXR0YWNobWVudFBhdGgsIFwiQXR0YWNobWVudCBwYXRoXCIpO1xuXG4gICAgYXdhaXQgdGhpcy5hc3NlcnREaXJlY3RvcnlFeGlzdHModmF1bHRQYXRoLCBcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGhcIik7XG4gICAgdGhpcy5hc3NlcnRJbnNpZGVWYXVsdCh2YXVsdFBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgXCJEZXN0aW5hdGlvbiBwYXRoXCIpO1xuICAgIHRoaXMuYXNzZXJ0SW5zaWRlVmF1bHQodmF1bHRQYXRoLCBlZmZlY3RpdmVBdHRhY2htZW50UGF0aCwgXCJBdHRhY2htZW50IHBhdGhcIik7XG4gICAgYXdhaXQgZnMubWtkaXIoZGVzdGluYXRpb25QYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCBmcy5ta2RpcihlZmZlY3RpdmVBdHRhY2htZW50UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4udGFyZ2V0LFxuICAgICAgdmF1bHRQYXRoLFxuICAgICAgZGVzdGluYXRpb25QYXRoLFxuICAgICAgZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsXG4gICAgICBhdHRhY2htZW50UGF0aDogdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLnRyaW0oKSxcbiAgICB9O1xuICB9XG5cbiAgdmFsaWRhdGUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdHJpbW1lZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LnZhdWx0UGF0aCk7XG4gICAgY29uc3QgdHJpbW1lZERlc3RpbmF0aW9uUGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCk7XG4gICAgY29uc3QgdHJpbW1lZEF0dGFjaG1lbnRQYXRoID0gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh0YXJnZXQuYXR0YWNobWVudFBhdGgpO1xuXG4gICAgaWYgKHRyaW1tZWRWYXVsdFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGggaXMgcmVxdWlyZWQuXCIpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoIG11c3QgYmUgYWJzb2x1dGUuXCIpO1xuICAgIH1cblxuICAgIGlmICh0cmltbWVkRGVzdGluYXRpb25QYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiBwYXRoIGlzIHJlcXVpcmVkLlwiKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZERlc3RpbmF0aW9uUGF0aCkpIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICB9IGVsc2UgaWYgKHBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSAmJiAhdGhpcy5pc0luc2lkZVZhdWx0KHRyaW1tZWRWYXVsdFBhdGgsIHRyaW1tZWREZXN0aW5hdGlvblBhdGgpKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHBhdGggbXVzdCBiZSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LlwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uKSB7XG4gICAgICBpZiAodHJpbW1lZEF0dGFjaG1lbnRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBlcnJvcnMucHVzaChcIkF0dGFjaG1lbnQgcGF0aCBpcyByZXF1aXJlZCB3aGVuIGF1dG9tYXRpYyBhdHRhY2htZW50IGRldGVjdGlvbiBpcyBkaXNhYmxlZC5cIik7XG4gICAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZEF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICBlcnJvcnMucHVzaChcIkF0dGFjaG1lbnQgcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICAgIH0gZWxzZSBpZiAocGF0aC5pc0Fic29sdXRlKHRyaW1tZWRWYXVsdFBhdGgpICYmICF0aGlzLmlzSW5zaWRlVmF1bHQodHJpbW1lZFZhdWx0UGF0aCwgdHJpbW1lZEF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICBlcnJvcnMucHVzaChcIkF0dGFjaG1lbnQgcGF0aCBtdXN0IGJlIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQuXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBlcnJvcnM7XG4gIH1cblxuICBhc3luYyByZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBub3JtYWxpemVkVmF1bHRQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhdWx0UGF0aCk7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IHBhdGguam9pbihub3JtYWxpemVkVmF1bHRQYXRoLCBcIi5vYnNpZGlhblwiLCBcImFwcC5qc29uXCIpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByYXcgPSBhd2FpdCBmcy5yZWFkRmlsZShjb25maWdQYXRoLCBcInV0ZjhcIik7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdykgYXMgeyBhdHRhY2htZW50Rm9sZGVyUGF0aD86IHN0cmluZyB9O1xuICAgICAgY29uc3QgYXR0YWNobWVudEZvbGRlclBhdGggPSBwYXJzZWQuYXR0YWNobWVudEZvbGRlclBhdGg/LnRyaW0oKTtcbiAgICAgIGlmICghYXR0YWNobWVudEZvbGRlclBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRWYXVsdFBhdGg7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvbHZlZCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChwYXRoLnJlc29sdmUobm9ybWFsaXplZFZhdWx0UGF0aCwgYXR0YWNobWVudEZvbGRlclBhdGgpKTtcbiAgICAgIGlmICghdGhpcy5pc0luc2lkZVZhdWx0KG5vcm1hbGl6ZWRWYXVsdFBhdGgsIHJlc29sdmVkKSkge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplZFZhdWx0UGF0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBub3JtYWxpemVkVmF1bHRQYXRoO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgYXNzZXJ0RGlyZWN0b3J5RXhpc3RzKGRpcmVjdG9yeVBhdGg6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMuc3RhdChkaXJlY3RvcnlQYXRoKTtcbiAgICAgIGlmICghc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbXVzdCBwb2ludCB0byBhIGRpcmVjdG9yeS5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gXCJFTk9FTlRcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IGRvZXMgbm90IGV4aXN0LmApO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3NlcnRJbnNpZGVWYXVsdCh2YXVsdFBhdGg6IHN0cmluZywgY2FuZGlkYXRlUGF0aDogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmlzSW5zaWRlVmF1bHQodmF1bHRQYXRoLCBjYW5kaWRhdGVQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IGJlIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpc0luc2lkZVZhdWx0KHZhdWx0UGF0aDogc3RyaW5nLCBjYW5kaWRhdGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCByZWxhdGl2ZSA9IHBhdGgucmVsYXRpdmUobm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhdWx0UGF0aCksIG5vcm1hbGl6ZUFic29sdXRlUGF0aChjYW5kaWRhdGVQYXRoKSk7XG4gICAgcmV0dXJuICEocmVsYXRpdmUuc3RhcnRzV2l0aChcIi4uXCIpIHx8IHBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZSkpO1xuICB9XG59XG5cbmNsYXNzIFRyYW5zZmVyUGxhbm5lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBUcmFuc1ZhdWx0UGx1Z2luLCBwcml2YXRlIHJlYWRvbmx5IGRlc3RpbmF0aW9uUmVzb2x2ZXI6IERlc3RpbmF0aW9uUmVzb2x2ZXIpIHt9XG5cbiAgYXN5bmMgcHJlcGFyZShzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8UHJlcGFyZWRUcmFuc2ZlclBsYW4+IHtcbiAgICBjb25zdCBzb3VyY2VWYXVsdFJvb3QgPSB0aGlzLmdldFNvdXJjZVZhdWx0Um9vdCgpO1xuICAgIGNvbnN0IHJlc29sdmVkVGFyZ2V0ID0gYXdhaXQgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyLnJlc29sdmUodGFyZ2V0KTtcbiAgICBjb25zdCBub3JtYWxpemVkU2VsZWN0aW9uID0gdGhpcy5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBjb25zdCBleHBsaWNpdEZpbGVzID0gdGhpcy5jb2xsZWN0RXhwbGljaXRGaWxlcyhub3JtYWxpemVkU2VsZWN0aW9uKTtcblxuICAgIGlmIChleHBsaWNpdEZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHNlbGVjdGlvbiBkb2VzIG5vdCBjb250YWluIGFueSBmaWxlcyB0byB0cmFuc2Zlci5cIik7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwbGljaXRNYXJrZG93bkZpbGVzID0gZXhwbGljaXRGaWxlcy5tYXAoKGVudHJ5KSA9PiBlbnRyeS5maWxlKS5maWx0ZXIoaXNNYXJrZG93bkZpbGUpO1xuICAgIGNvbnN0IHJldmlld1Jvb3RzOiBSZXZpZXdOb2RlW10gPSBbXTtcbiAgICBjb25zdCBkaXJlY3REZXBlbmRlbmNpZXMgPSBuZXcgTWFwPHN0cmluZywgRGlyZWN0RGVwZW5kZW5jaWVzPigpO1xuICAgIGNvbnN0IGRpcmVjdE1hcmtkb3duUmVsYXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBEaXJlY3RSZWxhdGlvbnNoaXBzPigpO1xuXG4gICAgY29uc3QgZ2V0UmVsYXRpb25zaGlwcyA9IChmaWxlOiBURmlsZSk6IERpcmVjdFJlbGF0aW9uc2hpcHMgPT4ge1xuICAgICAgY29uc3QgY2FjaGVkID0gcmVsYXRpb25zaGlwc0NhY2hlLmdldChmaWxlLnBhdGgpO1xuICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICByZXR1cm4gY2FjaGVkO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IHRoaXMuY29sbGVjdERpcmVjdFJlbGF0aW9uc2hpcHMoZmlsZSk7XG4gICAgICByZWxhdGlvbnNoaXBzQ2FjaGUuc2V0KGZpbGUucGF0aCwgcmVsYXRpb25zaGlwcyk7XG4gICAgICBkaXJlY3REZXBlbmRlbmNpZXMuc2V0KGZpbGUucGF0aCwge1xuICAgICAgICBtYXJrZG93bjogcmVsYXRpb25zaGlwcy5tYXJrZG93bixcbiAgICAgICAgYXR0YWNobWVudHM6IHJlbGF0aW9uc2hpcHMuYXR0YWNobWVudHMsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZWxhdGlvbnNoaXBzO1xuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZXhwbGljaXRNYXJrZG93bkZpbGVzKSB7XG4gICAgICBjb25zdCByZWxhdGlvbnNoaXBzID0gZ2V0UmVsYXRpb25zaGlwcyhmaWxlKTtcbiAgICAgIGRpcmVjdE1hcmtkb3duUmVsYXRpb25zLnNldChmaWxlLnBhdGgsIG5ldyBTZXQ8c3RyaW5nPihbXG4gICAgICAgIC4uLnJlbGF0aW9uc2hpcHMubWFya2Rvd24sXG4gICAgICAgIC4uLnJlbGF0aW9uc2hpcHMuYmFja2xpbmtzLFxuICAgICAgXSkpO1xuXG4gICAgICBjb25zdCBncm91cHM6IFJldmlld05vZGVbXSA9IHRoaXMuY3JlYXRlQXR0YWNobWVudEdyb3VwKGZpbGUucGF0aCwgZmlsZS5wYXRoLCBnZXRSZWxhdGlvbnNoaXBzKTtcbiAgICAgIGlmIChyZWxhdGlvbnNoaXBzLm1hcmtkb3duLnNpemUgPiAwKSB7XG4gICAgICAgIGdyb3Vwcy5wdXNoKHtcbiAgICAgICAgICBpZDogYCR7ZmlsZS5wYXRofTo6dG8tZ3JvdXBgLFxuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICBsYWJlbDogXCJsaW5rcyB0b1wiLFxuICAgICAgICAgIGRpcmVjdGlvbjogXCJ0b1wiLFxuICAgICAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5tYXJrZG93bl1cbiAgICAgICAgICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gbGVmdC5sb2NhbGVDb21wYXJlKHJpZ2h0KSlcbiAgICAgICAgICAgIC5tYXAoKG5vdGVQYXRoKSA9PiB0aGlzLmNyZWF0ZU5vdGVOb2RlKGZpbGUucGF0aCwgXCJ0b1wiLCBub3RlUGF0aCwgZ2V0UmVsYXRpb25zaGlwcykpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZWxhdGlvbnNoaXBzLmJhY2tsaW5rcy5zaXplID4gMCkge1xuICAgICAgICBncm91cHMucHVzaCh7XG4gICAgICAgICAgaWQ6IGAke2ZpbGUucGF0aH06OmZyb20tZ3JvdXBgLFxuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICBsYWJlbDogXCJsaW5rcyBmcm9tXCIsXG4gICAgICAgICAgZGlyZWN0aW9uOiBcImZyb21cIixcbiAgICAgICAgICBjaGlsZHJlbjogWy4uLnJlbGF0aW9uc2hpcHMuYmFja2xpbmtzXVxuICAgICAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAgICAgLm1hcCgobm90ZVBhdGgpID0+IHRoaXMuY3JlYXRlTm90ZU5vZGUoZmlsZS5wYXRoLCBcImZyb21cIiwgbm90ZVBhdGgsIGdldFJlbGF0aW9uc2hpcHMpKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXZpZXdSb290cy5wdXNoKHtcbiAgICAgICAgaWQ6IGAke2ZpbGUucGF0aH06OnJvb3RgLFxuICAgICAgICB0eXBlOiBcIm5vdGVcIixcbiAgICAgICAgbGFiZWw6IGZpbGUuYmFzZW5hbWUsXG4gICAgICAgIGZpbGVQYXRoOiBmaWxlLnBhdGgsXG4gICAgICAgIGNoaWxkcmVuOiBncm91cHMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlVmF1bHRSb290LFxuICAgICAgdGFyZ2V0OiByZXNvbHZlZFRhcmdldCxcbiAgICAgIGV4cGxpY2l0RmlsZXMsXG4gICAgICBleHBsaWNpdE1hcmtkb3duUGF0aHM6IGV4cGxpY2l0TWFya2Rvd25GaWxlcy5tYXAoKGZpbGUpID0+IGZpbGUucGF0aCksXG4gICAgICBzZWxlY3RlZEZvbGRlclBhdGhzOiBub3JtYWxpemVkU2VsZWN0aW9uLmZpbHRlcigoZW50cnkpOiBlbnRyeSBpcyBURm9sZGVyID0+IGVudHJ5IGluc3RhbmNlb2YgVEZvbGRlcikubWFwKChmb2xkZXIpID0+IGZvbGRlci5wYXRoKSxcbiAgICAgIHJldmlld1Jvb3RzLFxuICAgICAgZGlyZWN0RGVwZW5kZW5jaWVzLFxuICAgICAgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnMsXG4gICAgfTtcbiAgfVxuXG4gIG5vcm1hbGl6ZVNlbGVjdGlvbihzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IFRBYnN0cmFjdEZpbGVbXSB7XG4gICAgY29uc3QgdW5pcXVlID0gbmV3IE1hcDxzdHJpbmcsIFRBYnN0cmFjdEZpbGU+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBzZWxlY3Rpb24pIHtcbiAgICAgIHVuaXF1ZS5zZXQobm9ybWFsaXplUGF0aChlbnRyeS5wYXRoKSwgZW50cnkpO1xuICAgIH1cbiAgICBjb25zdCBzZWxlY3RlZFBhdGhzID0gbmV3IFNldCh1bmlxdWUua2V5cygpKTtcbiAgICByZXR1cm4gWy4uLnVuaXF1ZS52YWx1ZXMoKV0uZmlsdGVyKChlbnRyeSkgPT4gIWhhc1NlbGVjdGVkQW5jZXN0b3IoZW50cnkucGF0aCwgc2VsZWN0ZWRQYXRocykpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTb3VyY2VWYXVsdFJvb3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCEoYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHJhbnMgVmF1bHQgcmVxdWlyZXMgYSBkZXNrdG9wIGZpbGUgc3lzdGVtIGFkYXB0ZXIuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbm9ybWFsaXplQWJzb2x1dGVQYXRoKGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKSk7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RFeHBsaWNpdEZpbGVzKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10ge1xuICAgIGNvbnN0IGV4cGxpY2l0RmlsZXM6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdID0gW107XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBzZWxlY3Rpb24pIHtcbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGV4cGxpY2l0RmlsZXMucHVzaCh7XG4gICAgICAgICAgZmlsZTogZW50cnksXG4gICAgICAgICAgZGVzdGluYXRpb25SZWxhdGl2ZVBhdGg6IHBhdGgucG9zaXguYmFzZW5hbWUobm9ybWFsaXplUGF0aChlbnRyeS5wYXRoKSksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0Rm9sZGVyRmlsZXMoZW50cnksIGVudHJ5LCBleHBsaWNpdEZpbGVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGV4cGxpY2l0RmlsZXM7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RGb2xkZXJGaWxlcyhmb2xkZXI6IFRGb2xkZXIsIHJvb3RGb2xkZXI6IFRGb2xkZXIsIHNpbms6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlSW5zaWRlUm9vdCA9IHBhdGgucG9zaXgucmVsYXRpdmUobm9ybWFsaXplUGF0aChyb290Rm9sZGVyLnBhdGgpLCBub3JtYWxpemVQYXRoKGNoaWxkLnBhdGgpKTtcbiAgICAgICAgc2luay5wdXNoKHtcbiAgICAgICAgICBmaWxlOiBjaGlsZCxcbiAgICAgICAgICBkZXN0aW5hdGlvblJlbGF0aXZlUGF0aDogbm9ybWFsaXplUGF0aChwYXRoLnBvc2l4LmpvaW4ocm9vdEZvbGRlci5uYW1lLCByZWxhdGl2ZUluc2lkZVJvb3QpKSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGNoaWxkIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICB0aGlzLmNvbGxlY3RGb2xkZXJGaWxlcyhjaGlsZCwgcm9vdEZvbGRlciwgc2luayk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVOb3RlTm9kZShcbiAgICByb290UGF0aDogc3RyaW5nLFxuICAgIGRpcmVjdGlvbjogUmV2aWV3RGlyZWN0aW9uLFxuICAgIG5vdGVQYXRoOiBzdHJpbmcsXG4gICAgZ2V0UmVsYXRpb25zaGlwczogKGZpbGU6IFRGaWxlKSA9PiBEaXJlY3RSZWxhdGlvbnNoaXBzLFxuICApOiBSZXZpZXdOb2RlIHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobm90ZVBhdGgpO1xuICAgIGNvbnN0IGNoaWxkcmVuID0gZmlsZSAmJiBpc01hcmtkb3duRmlsZShmaWxlKVxuICAgICAgPyB0aGlzLmNyZWF0ZUF0dGFjaG1lbnRHcm91cChgJHtyb290UGF0aH06OiR7ZGlyZWN0aW9ufTo6JHtub3RlUGF0aH1gLCBmaWxlLnBhdGgsIGdldFJlbGF0aW9uc2hpcHMpXG4gICAgICA6IFtdO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogYCR7cm9vdFBhdGh9Ojoke2RpcmVjdGlvbn06OiR7bm90ZVBhdGh9YCxcbiAgICAgIHR5cGU6IFwibm90ZVwiLFxuICAgICAgbGFiZWw6IGZpbGU/LmJhc2VuYW1lID8/IHBhdGgucG9zaXguYmFzZW5hbWUobm90ZVBhdGgsIFwiLm1kXCIpLFxuICAgICAgZmlsZVBhdGg6IG5vdGVQYXRoLFxuICAgICAgY2hpbGRyZW4sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXR0YWNobWVudEdyb3VwKFxuICAgIGJyYW5jaElkOiBzdHJpbmcsXG4gICAgbm90ZVBhdGg6IHN0cmluZyxcbiAgICBnZXRSZWxhdGlvbnNoaXBzOiAoZmlsZTogVEZpbGUpID0+IERpcmVjdFJlbGF0aW9uc2hpcHMsXG4gICk6IFJldmlld05vZGVbXSB7XG4gICAgY29uc3Qgbm90ZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChub3RlUGF0aCk7XG4gICAgaWYgKCFub3RlRmlsZSB8fCAhaXNNYXJrZG93bkZpbGUobm90ZUZpbGUpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBnZXRSZWxhdGlvbnNoaXBzKG5vdGVGaWxlKTtcbiAgICBpZiAocmVsYXRpb25zaGlwcy5hdHRhY2htZW50cy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBbe1xuICAgICAgaWQ6IGAke2JyYW5jaElkfTo6YXR0YWNobWVudHMtZ3JvdXBgLFxuICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgbGFiZWw6IFwiYXR0YWNobWVudHNcIixcbiAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5hdHRhY2htZW50c11cbiAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAubWFwKChhdHRhY2htZW50UGF0aCkgPT4gdGhpcy5jcmVhdGVBdHRhY2htZW50Tm9kZShicmFuY2hJZCwgYXR0YWNobWVudFBhdGgpKSxcbiAgICB9XTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXR0YWNobWVudE5vZGUoYnJhbmNoSWQ6IHN0cmluZywgYXR0YWNobWVudFBhdGg6IHN0cmluZyk6IFJldmlld05vZGUge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChhdHRhY2htZW50UGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBgJHticmFuY2hJZH06OmF0dGFjaG1lbnQ6OiR7YXR0YWNobWVudFBhdGh9YCxcbiAgICAgIHR5cGU6IFwiYXR0YWNobWVudFwiLFxuICAgICAgbGFiZWw6IGZpbGU/Lm5hbWUgPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShhdHRhY2htZW50UGF0aCksXG4gICAgICBmaWxlUGF0aDogYXR0YWNobWVudFBhdGgsXG4gICAgICBjaGlsZHJlbjogW10sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdERpcmVjdFJlbGF0aW9uc2hpcHMoZmlsZTogVEZpbGUpOiBEaXJlY3RSZWxhdGlvbnNoaXBzIHtcbiAgICBjb25zdCBtYXJrZG93biA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGF0dGFjaG1lbnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgZm9yIChjb25zdCByZWYgb2YgWy4uLihjYWNoZT8ubGlua3MgPz8gW10pLCAuLi4oY2FjaGU/LmVtYmVkcyA/PyBbXSksIC4uLihjYWNoZT8uZnJvbnRtYXR0ZXJMaW5rcyA/PyBbXSldKSB7XG4gICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGdldExpbmtwYXRoKHJlZi5saW5rKSwgZmlsZS5wYXRoKTtcbiAgICAgIGlmICghKGRlc3RpbmF0aW9uIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGlzTWFya2Rvd25GaWxlKGRlc3RpbmF0aW9uKSkge1xuICAgICAgICBtYXJrZG93bi5hZGQoZGVzdGluYXRpb24ucGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRhY2htZW50cy5hZGQoZGVzdGluYXRpb24ucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYmFja2xpbmtzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcmVzb2x2ZWRMaW5rcyA9ICh0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZSBhcyB1bmtub3duIGFzIHtcbiAgICAgIHJlc29sdmVkTGlua3M/OiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PjtcbiAgICB9KS5yZXNvbHZlZExpbmtzID8/IHt9O1xuICAgIGZvciAoY29uc3QgW3NvdXJjZVBhdGgsIHRhcmdldHNdIG9mIE9iamVjdC5lbnRyaWVzKHJlc29sdmVkTGlua3MpKSB7XG4gICAgICBpZiAoIXRhcmdldHNbZmlsZS5wYXRoXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChzb3VyY2VQYXRoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlICYmIGlzTWFya2Rvd25GaWxlKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGJhY2tsaW5rcy5hZGQoc291cmNlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1hcmtkb3duLFxuICAgICAgYmFja2xpbmtzLFxuICAgICAgYXR0YWNobWVudHMsXG4gICAgfTtcbiAgfVxufVxuXG5jbGFzcyBUcmFuc2ZlckV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4pIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbiwgbW9kZTogVHJhbnNmZXJNb2RlLCBjb25maXJtZWRTZWxlY3Rpb25QYXRocz86IHN0cmluZ1tdKTogUHJvbWlzZTxUcmFuc2ZlclN1bW1hcnk+IHtcbiAgICBjb25zdCBzZWxlY3RlZFJldmlld1BhdGhzID0gY29uZmlybWVkU2VsZWN0aW9uUGF0aHNcbiAgICAgID8gbmV3IFNldDxzdHJpbmc+KGNvbmZpcm1lZFNlbGVjdGlvblBhdGhzKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gICAgY29uc3Qgc2VsZWN0ZWRNYXJrZG93blBhdGhzID0gc2VsZWN0ZWRSZXZpZXdQYXRoc1xuICAgICAgPyBuZXcgU2V0PHN0cmluZz4oWy4uLnNlbGVjdGVkUmV2aWV3UGF0aHNdLmZpbHRlcigoZW50cnkpID0+IHRoaXMuaXNTZWxlY3RlZE1hcmtkb3duUGF0aChlbnRyeSkpKVxuICAgICAgOiBuZXcgU2V0PHN0cmluZz4ocGxhbi5leHBsaWNpdE1hcmtkb3duUGF0aHMpO1xuXG4gICAgY29uc3QgZHJhZnRFbnRyaWVzID0gbmV3IE1hcDxzdHJpbmcsIERyYWZ0VHJhbnNmZXJFbnRyeT4oKTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGxhbi5leHBsaWNpdEZpbGVzKSB7XG4gICAgICBpZiAoaXNNYXJrZG93bkZpbGUoZW50cnkuZmlsZSkgJiYgIXNlbGVjdGVkTWFya2Rvd25QYXRocy5oYXMoZW50cnkuZmlsZS5wYXRoKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGRyYWZ0RW50cmllcy5zZXQoXG4gICAgICAgIGVudHJ5LmZpbGUucGF0aCxcbiAgICAgICAgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIGVudHJ5LmZpbGUsIHRydWUsIGVudHJ5LmRlc3RpbmF0aW9uUmVsYXRpdmVQYXRoKSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBtYXJrZG93blBhdGggb2Ygc2VsZWN0ZWRNYXJrZG93blBhdGhzKSB7XG4gICAgICBpZiAoZHJhZnRFbnRyaWVzLmhhcyhtYXJrZG93blBhdGgpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFya2Rvd25GaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobWFya2Rvd25QYXRoKTtcbiAgICAgIGlmIChtYXJrZG93bkZpbGUgJiYgaXNNYXJrZG93bkZpbGUobWFya2Rvd25GaWxlKSkge1xuICAgICAgICBkcmFmdEVudHJpZXMuc2V0KG1hcmtkb3duUGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIG1hcmtkb3duRmlsZSwgZmFsc2UpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VsZWN0ZWRSZXZpZXdQYXRocykge1xuICAgICAgZm9yIChjb25zdCBzZWxlY3RlZFBhdGggb2Ygc2VsZWN0ZWRSZXZpZXdQYXRocykge1xuICAgICAgICBpZiAoZHJhZnRFbnRyaWVzLmhhcyhzZWxlY3RlZFBhdGgpIHx8IHNlbGVjdGVkTWFya2Rvd25QYXRocy5oYXMoc2VsZWN0ZWRQYXRoKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHNlbGVjdGVkUGF0aCk7XG4gICAgICAgIGlmIChzZWxlY3RlZEZpbGUgJiYgIWlzTWFya2Rvd25GaWxlKHNlbGVjdGVkRmlsZSkpIHtcbiAgICAgICAgICBkcmFmdEVudHJpZXMuc2V0KHNlbGVjdGVkUGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIHNlbGVjdGVkRmlsZSwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbmNsdWRlTGlua2VkRmlsZXMpIHtcbiAgICAgIGZvciAoY29uc3QgbWFya2Rvd25QYXRoIG9mIHNlbGVjdGVkTWFya2Rvd25QYXRocykge1xuICAgICAgICBjb25zdCBkZXBlbmRlbmNpZXMgPSBwbGFuLmRpcmVjdERlcGVuZGVuY2llcy5nZXQobWFya2Rvd25QYXRoKTtcbiAgICAgICAgaWYgKCFkZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGF0dGFjaG1lbnRQYXRoIG9mIGRlcGVuZGVuY2llcy5hdHRhY2htZW50cykge1xuICAgICAgICAgIGlmIChzZWxlY3RlZFJldmlld1BhdGhzICYmICFzZWxlY3RlZFJldmlld1BhdGhzLmhhcyhhdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZHJhZnRFbnRyaWVzLmhhcyhhdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhdHRhY2htZW50RmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGF0dGFjaG1lbnRQYXRoKTtcbiAgICAgICAgICBpZiAoYXR0YWNobWVudEZpbGUpIHtcbiAgICAgICAgICAgIGRyYWZ0RW50cmllcy5zZXQoYXR0YWNobWVudFBhdGgsIHRoaXMuY3JlYXRlRHJhZnRFbnRyeShwbGFuLCBhdHRhY2htZW50RmlsZSwgZmFsc2UpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnkgPSB7XG4gICAgICByZXF1ZXN0ZWRGaWxlQ291bnQ6IGRyYWZ0RW50cmllcy5zaXplLFxuICAgICAgdHJhbnNmZXJyZWRGaWxlQ291bnQ6IDAsXG4gICAgICBtb3ZlZEZpbGVDb3VudDogMCxcbiAgICAgIHNraXBwZWRDb25mbGljdENvdW50OiAwLFxuICAgICAgcmVuYW1lZENvdW50OiAwLFxuICAgICAgZmFpbGVkQ291bnQ6IDAsXG4gICAgICBza2lwcGVkRW50cmllczogW10sXG4gICAgICB3YXJuaW5nczogW10sXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc29sdmVkRW50cmllcyA9IGF3YWl0IHRoaXMucmVzb2x2ZUNvbmZsaWN0cyhwbGFuLCBbLi4uZHJhZnRFbnRyaWVzLnZhbHVlcygpXSwgc3VtbWFyeSk7XG4gICAgY29uc3QgZGVzdGluYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzb2x2ZWRFbnRyaWVzKSB7XG4gICAgICBkZXN0aW5hdGlvbk1hcC5zZXQoZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgsIGVudHJ5LmRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IHRyYW5zZmVycmVkRmlsZXM6IFRGaWxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc29sdmVkRW50cmllcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIGlmIChlbnRyeS5vdmVyd3JpdGVFeGlzdGluZykge1xuICAgICAgICAgIGF3YWl0IGZzLnJtKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZW50cnkuc2hvdWxkUmV3cml0ZUxpbmtzKSB7XG4gICAgICAgICAgbGV0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuY2FjaGVkUmVhZChlbnRyeS5zb3VyY2VGaWxlKTtcbiAgICAgICAgICBjb250ZW50ID0gdGhpcy5yZXdyaXRlTWFya2Rvd25MaW5rcyhjb250ZW50LCBlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCwgZW50cnkuZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCwgZGVzdGluYXRpb25NYXApO1xuICAgICAgICAgIGNvbnN0IHRhZ1Jlc3VsdCA9IHRoaXMuYXBwbHlEZXN0aW5hdGlvblRhZ3MoY29udGVudCwgbW9kZSwgZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgICAgICAgIGNvbnRlbnQgPSB0YWdSZXN1bHQuY29udGVudDtcbiAgICAgICAgICBpZiAodGFnUmVzdWx0Lndhcm5pbmcpIHtcbiAgICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaCh0YWdSZXN1bHQud2FybmluZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZShlbnRyeS5kZXN0aW5hdGlvbkFic29sdXRlUGF0aCwgY29udGVudCwgXCJ1dGY4XCIpO1xuXG4gICAgICAgICAgaWYgKG1vZGUgPT09IFwiY29weVwiICYmIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50cykge1xuICAgICAgICAgICAgY29uc3Qgc291cmNlVGFnUmVzdWx0ID0gYXdhaXQgdGhpcy50YWdTb3VyY2VNYXJrZG93bihlbnRyeS5zb3VyY2VGaWxlLCB0aGlzLmdldFRhZ3NGb3JNb2RlKG1vZGUpKTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VUYWdSZXN1bHQpIHtcbiAgICAgICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKHNvdXJjZVRhZ1Jlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLmNvcHlGaWxlKGVudHJ5LnNvdXJjZUFic29sdXRlUGF0aCwgZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhbnNmZXJyZWRGaWxlcy5wdXNoKGVudHJ5LnNvdXJjZUZpbGUpO1xuICAgICAgICBzdW1tYXJ5LnRyYW5zZmVycmVkRmlsZUNvdW50ICs9IDE7XG4gICAgICAgIGlmIChlbnRyeS53YXNSZW5hbWVkKSB7XG4gICAgICAgICAgc3VtbWFyeS5yZW5hbWVkQ291bnQgKz0gMTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3VtbWFyeS5mYWlsZWRDb3VudCArPSAxO1xuICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYEZhaWxlZCB0byB0cmFuc2ZlciAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofTogJHt0aGlzLnRvRXJyb3JNZXNzYWdlKGVycm9yLCBcIlVua25vd24gdHJhbnNmZXIgZXJyb3IuXCIpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtb2RlID09PSBcIm1vdmVcIikge1xuICAgICAgc3VtbWFyeS5tb3ZlZEZpbGVDb3VudCA9IGF3YWl0IHRoaXMuZGVsZXRlTW92ZWRTb3VyY2VzKHRyYW5zZmVycmVkRmlsZXMsIHBsYW4uc2VsZWN0ZWRGb2xkZXJQYXRocywgc3VtbWFyeSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1bW1hcnk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURyYWZ0RW50cnkoXG4gICAgcGxhbjogUHJlcGFyZWRUcmFuc2ZlclBsYW4sXG4gICAgZmlsZTogVEZpbGUsXG4gICAgaXNFeHBsaWNpdFNlbGVjdGlvbjogYm9vbGVhbixcbiAgICBleHBsaWNpdERlc3RpbmF0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nLFxuICApOiBEcmFmdFRyYW5zZmVyRW50cnkge1xuICAgIGNvbnN0IHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlLnBhdGgpO1xuICAgIGNvbnN0IHNvdXJjZUFic29sdXRlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChwYXRoLmpvaW4ocGxhbi5zb3VyY2VWYXVsdFJvb3QsIC4uLnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLnNwbGl0KFwiL1wiKSkpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uQmFzZSA9ICFpc0V4cGxpY2l0U2VsZWN0aW9uICYmICFpc01hcmtkb3duRmlsZShmaWxlKVxuICAgICAgPyBwbGFuLnRhcmdldC5lZmZlY3RpdmVBdHRhY2htZW50UGF0aFxuICAgICAgOiBwbGFuLnRhcmdldC5kZXN0aW5hdGlvblBhdGg7XG4gICAgY29uc3QgcmVsYXRpdmVEZXN0aW5hdGlvbiA9IGV4cGxpY2l0RGVzdGluYXRpb25SZWxhdGl2ZVBhdGggPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgY29uc3QgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoXG4gICAgICBwYXRoLmpvaW4oZGVzdGluYXRpb25CYXNlLCAuLi5ub3JtYWxpemVQYXRoKHJlbGF0aXZlRGVzdGluYXRpb24pLnNwbGl0KFwiL1wiKSksXG4gICAgKTtcbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlRmlsZTogZmlsZSxcbiAgICAgIHNvdXJjZUFic29sdXRlUGF0aCxcbiAgICAgIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLFxuICAgICAgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgsXG4gICAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiB0b1ZhdWx0UmVsYXRpdmVQYXRoKHBsYW4udGFyZ2V0LnZhdWx0UGF0aCwgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpLFxuICAgICAgc2hvdWxkUmV3cml0ZUxpbmtzOiBpc01hcmtkb3duRmlsZShmaWxlKSxcbiAgICAgIGlzRXhwbGljaXRTZWxlY3Rpb24sXG4gICAgICB3YXNSZW5hbWVkOiBmYWxzZSxcbiAgICAgIG92ZXJ3cml0ZUV4aXN0aW5nOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBpc1NlbGVjdGVkTWFya2Rvd25QYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICAgIHJldHVybiAhIWZpbGUgJiYgaXNNYXJrZG93bkZpbGUoZmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlc29sdmVDb25mbGljdHMoXG4gICAgcGxhbjogUHJlcGFyZWRUcmFuc2ZlclBsYW4sXG4gICAgZW50cmllczogRHJhZnRUcmFuc2ZlckVudHJ5W10sXG4gICAgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5LFxuICApOiBQcm9taXNlPEZpbmFsaXplZFRyYW5zZmVyRW50cnlbXT4ge1xuICAgIGNvbnN0IHJlc2VydmVkUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCByZXNvbHZlZDogRmluYWxpemVkVHJhbnNmZXJFbnRyeVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGNvbnN0IGRlc2lyZWRQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoKTtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoZW50cnkuc291cmNlQWJzb2x1dGVQYXRoKTtcbiAgICAgIGNvbnN0IGFscmVhZHlSZXNlcnZlZCA9IHJlc2VydmVkUGF0aHMuaGFzKGRlc2lyZWRQYXRoKTtcbiAgICAgIGNvbnN0IGFscmVhZHlFeGlzdHMgPSBhd2FpdCB0aGlzLnBhdGhFeGlzdHMoZGVzaXJlZFBhdGgpO1xuICAgICAgY29uc3Qgc291cmNlRXF1YWxzRGVzdGluYXRpb24gPSBkZXNpcmVkUGF0aCA9PT0gc291cmNlUGF0aDtcbiAgICAgIGNvbnN0IGhhc0NvbmZsaWN0ID0gYWxyZWFkeVJlc2VydmVkIHx8IGFscmVhZHlFeGlzdHMgfHwgc291cmNlRXF1YWxzRGVzdGluYXRpb247XG5cbiAgICAgIGlmIChoYXNDb25mbGljdCAmJiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5ID09PSBcInNraXBcIikge1xuICAgICAgICBzdW1tYXJ5LnNraXBwZWRDb25mbGljdENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkuc2tpcHBlZEVudHJpZXMucHVzaChlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICAgIGlmIChzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbikge1xuICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgU2tpcHBlZCAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofSBiZWNhdXNlIHNvdXJjZSBhbmQgZGVzdGluYXRpb24gYXJlIGlkZW50aWNhbC5gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYFNraXBwZWQgJHtlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aH0gYmVjYXVzZSAke2Rlc2lyZWRQYXRofSBhbHJlYWR5IGV4aXN0cy5gKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGZpbmFsUGF0aCA9IGRlc2lyZWRQYXRoO1xuICAgICAgbGV0IHdhc1JlbmFtZWQgPSBmYWxzZTtcbiAgICAgIGlmIChoYXNDb25mbGljdCAmJiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9PT0gXCJhdXRvLXJlbmFtZVwiIHx8IGFscmVhZHlSZXNlcnZlZCB8fCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbikpIHtcbiAgICAgICAgZmluYWxQYXRoID0gYXdhaXQgdGhpcy5maW5kQXZhaWxhYmxlUGF0aChkZXNpcmVkUGF0aCwgcmVzZXJ2ZWRQYXRocywgc291cmNlUGF0aCk7XG4gICAgICAgIHdhc1JlbmFtZWQgPSBmaW5hbFBhdGggIT09IGRlc2lyZWRQYXRoO1xuICAgICAgfVxuXG4gICAgICByZXNlcnZlZFBhdGhzLmFkZChmaW5hbFBhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7XG4gICAgICAgIC4uLmVudHJ5LFxuICAgICAgICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aDogZmluYWxQYXRoLFxuICAgICAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiB0b1ZhdWx0UmVsYXRpdmVQYXRoKHBsYW4udGFyZ2V0LnZhdWx0UGF0aCwgZmluYWxQYXRoKSxcbiAgICAgICAgd2FzUmVuYW1lZCxcbiAgICAgICAgb3ZlcndyaXRlRXhpc3Rpbmc6IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3kgPT09IFwib3ZlcndyaXRlXCIgJiYgIXdhc1JlbmFtZWQgJiYgYWxyZWFkeUV4aXN0cyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXNvbHZlZDtcbiAgfVxuXG4gIHByaXZhdGUgcmV3cml0ZU1hcmtkb3duTGlua3MoXG4gICAgY29udGVudDogc3RyaW5nLFxuICAgIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gICAgZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nLFxuICAgIGRlc3RpbmF0aW9uTWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICApOiBzdHJpbmcge1xuICAgIGxldCByZXdyaXR0ZW4gPSBjb250ZW50LnJlcGxhY2UoLyghKT9cXFtcXFsoW15cXF1dKylcXF1cXF0vZywgKG1hdGNoLCBlbWJlZFByZWZpeDogc3RyaW5nIHwgdW5kZWZpbmVkLCBpbm5lcjogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBhbGlhc1NlcGFyYXRvciA9IGlubmVyLmluZGV4T2YoXCJ8XCIpO1xuICAgICAgY29uc3QgbGlua1RleHQgPSBhbGlhc1NlcGFyYXRvciA+PSAwID8gaW5uZXIuc2xpY2UoMCwgYWxpYXNTZXBhcmF0b3IpIDogaW5uZXI7XG4gICAgICBjb25zdCBhbGlhcyA9IGFsaWFzU2VwYXJhdG9yID49IDAgPyBpbm5lci5zbGljZShhbGlhc1NlcGFyYXRvciArIDEpIDogXCJcIjtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUmVmZXJlbmNlKGxpbmtUZXh0LCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hcHBlZFBhdGggPSBkZXN0aW5hdGlvbk1hcC5nZXQocmVzb2x2ZWQudGFyZ2V0RmlsZS5wYXRoKTtcbiAgICAgIGlmICghbWFwcGVkUGF0aCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0UGF0aCA9IHRoaXMudG9XaWtpTGlua1BhdGgoZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCwgbWFwcGVkUGF0aCwgcmVzb2x2ZWQudGFyZ2V0RmlsZS5leHRlbnNpb24pO1xuICAgICAgY29uc3QgcmVidWlsdCA9IGAke25leHRQYXRofSR7cmVzb2x2ZWQuc3VicGF0aH0ke2FsaWFzID8gYHwke2FsaWFzfWAgOiBcIlwifWA7XG4gICAgICByZXR1cm4gYCR7ZW1iZWRQcmVmaXggPz8gXCJcIn1bWyR7cmVidWlsdH1dXWA7XG4gICAgfSk7XG5cbiAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZSgvKCEpP1xcWyhbXlxcXV0qKVxcXVxcKChbXildKylcXCkvZywgKG1hdGNoLCBlbWJlZFByZWZpeDogc3RyaW5nIHwgdW5kZWZpbmVkLCBsYWJlbDogc3RyaW5nLCByYXdIcmVmOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHRoaXMucGFyc2VNYXJrZG93bkhyZWYocmF3SHJlZik7XG4gICAgICBpZiAoIXBhcnNlZCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZVJlZmVyZW5jZShwYXJzZWQucGF0aCwgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXBwZWRQYXRoID0gZGVzdGluYXRpb25NYXAuZ2V0KHJlc29sdmVkLnRhcmdldEZpbGUucGF0aCk7XG4gICAgICBpZiAoIW1hcHBlZFBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVsYXRpdmVMaW5rID0gdGhpcy50b1JlbGF0aXZlTGluayhkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBtYXBwZWRQYXRoKTtcbiAgICAgIGNvbnN0IHJlYnVpbHRIcmVmID0gYCR7dGhpcy5lbmNvZGVNYXJrZG93bkxpbmtQYXRoKHJlbGF0aXZlTGluayl9JHtyZXNvbHZlZC5zdWJwYXRofWA7XG4gICAgICBjb25zdCB3cmFwcGVkSHJlZiA9IHBhcnNlZC53cmFwcGVkSW5BbmdsZXMgPyBgPCR7cmVidWlsdEhyZWZ9PmAgOiByZWJ1aWx0SHJlZjtcbiAgICAgIHJldHVybiBgJHtlbWJlZFByZWZpeCA/PyBcIlwifVske2xhYmVsfV0oJHt3cmFwcGVkSHJlZn0pYDtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXdyaXR0ZW47XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVSZWZlcmVuY2UobGlua1RleHQ6IHN0cmluZywgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZyk6IHsgdGFyZ2V0RmlsZTogVEZpbGU7IHN1YnBhdGg6IHN0cmluZyB9IHwgbnVsbCB7XG4gICAgY29uc3QgaGFzaEluZGV4ID0gbGlua1RleHQuaW5kZXhPZihcIiNcIik7XG4gICAgY29uc3QgcmF3UGF0aCA9IGhhc2hJbmRleCA+PSAwID8gbGlua1RleHQuc2xpY2UoMCwgaGFzaEluZGV4KSA6IGxpbmtUZXh0O1xuICAgIGNvbnN0IHN1YnBhdGggPSBoYXNoSW5kZXggPj0gMCA/IGxpbmtUZXh0LnNsaWNlKGhhc2hJbmRleCkgOiBcIlwiO1xuICAgIGNvbnN0IGRlY29kZWRQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KHJhd1BhdGgudHJpbSgpKTtcbiAgICBpZiAoZGVjb2RlZFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0RmlsZSA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGdldExpbmtwYXRoKGRlY29kZWRQYXRoKSwgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgIGlmICghdGFyZ2V0RmlsZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7IHRhcmdldEZpbGUsIHN1YnBhdGggfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VNYXJrZG93bkhyZWYocmF3SHJlZjogc3RyaW5nKTogUGFyc2VkTWFya2Rvd25IcmVmIHwgbnVsbCB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHJhd0hyZWYudHJpbSgpO1xuICAgIGlmICh0cmltbWVkLnN0YXJ0c1dpdGgoXCIjXCIpIHx8IC9eW2Etel0rOi9pLnRlc3QodHJpbW1lZCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB3cmFwcGVkSW5BbmdsZXMgPSB0cmltbWVkLnN0YXJ0c1dpdGgoXCI8XCIpICYmIHRyaW1tZWQuZW5kc1dpdGgoXCI+XCIpICYmIHRyaW1tZWQubGVuZ3RoID4gMjtcbiAgICByZXR1cm4ge1xuICAgICAgcGF0aDogd3JhcHBlZEluQW5nbGVzID8gdHJpbW1lZC5zbGljZSgxLCAtMSkgOiB0cmltbWVkLFxuICAgICAgd3JhcHBlZEluQW5nbGVzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHRvV2lraUxpbmtQYXRoKGN1cnJlbnREZXN0aW5hdGlvbjogc3RyaW5nLCB0YXJnZXREZXN0aW5hdGlvbjogc3RyaW5nLCBleHRlbnNpb246IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVsYXRpdmVMaW5rID0gdGhpcy50b1JlbGF0aXZlTGluayhjdXJyZW50RGVzdGluYXRpb24sIHRhcmdldERlc3RpbmF0aW9uKTtcbiAgICByZXR1cm4gZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkgPT09IFwibWRcIiA/IHJlbGF0aXZlTGluay5yZXBsYWNlKC9cXC5tZCQvaSwgXCJcIikgOiByZWxhdGl2ZUxpbms7XG4gIH1cblxuICBwcml2YXRlIHRvUmVsYXRpdmVMaW5rKGZyb21GaWxlOiBzdHJpbmcsIHRvRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWxhdGl2ZSA9IG5vcm1hbGl6ZVBhdGgocGF0aC5wb3NpeC5yZWxhdGl2ZShwYXRoLnBvc2l4LmRpcm5hbWUoZnJvbUZpbGUpLCB0b0ZpbGUpKTtcbiAgICByZXR1cm4gcmVsYXRpdmUubGVuZ3RoID4gMCA/IHJlbGF0aXZlIDogcGF0aC5wb3NpeC5iYXNlbmFtZSh0b0ZpbGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbmNvZGVNYXJrZG93bkxpbmtQYXRoKGxpbmtQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBlbmNvZGVVUkkobGlua1BhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseURlc3RpbmF0aW9uVGFncyhjb250ZW50OiBzdHJpbmcsIG1vZGU6IFRyYW5zZmVyTW9kZSwgc291cmNlUGF0aDogc3RyaW5nKTogRnJvbnRtYXR0ZXJUYWdSZXN1bHQge1xuICAgIGNvbnN0IHRhZ3MgPSB0aGlzLmdldFRhZ3NGb3JNb2RlKG1vZGUpO1xuICAgIGlmICh0YWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHsgY29udGVudCB9O1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmFkZFRhZ3NUb01hcmtkb3duQ29udGVudChjb250ZW50LCB0YWdzKTtcbiAgICBpZiAocmVzdWx0Lndhcm5pbmcpIHtcbiAgICAgIHJldHVybiB7IGNvbnRlbnQsIHdhcm5pbmc6IGBTa2lwcGVkIHRhZ2dpbmcgJHtzb3VyY2VQYXRofTogJHtyZXN1bHQud2FybmluZ31gIH07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHRhZ1NvdXJjZU1hcmtkb3duKGZpbGU6IFRGaWxlLCB0YWdzOiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGlmICghaXNNYXJrZG93bkZpbGUoZmlsZSkgfHwgdGFncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGN1cnJlbnRDb250ZW50LCB0YWdzKTtcbiAgICBpZiAocmVzdWx0Lndhcm5pbmcpIHtcbiAgICAgIHJldHVybiBgU2tpcHBlZCB0YWdnaW5nIHNvdXJjZSBmaWxlICR7ZmlsZS5wYXRofTogJHtyZXN1bHQud2FybmluZ31gO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LmNvbnRlbnQgIT09IGN1cnJlbnRDb250ZW50KSB7XG4gICAgICBjb25zdCBmcm9udG1hdHRlclJhbmdlID0gY29sbGVjdEZyb250bWF0dGVyUmFuZ2UoY3VycmVudENvbnRlbnQpO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZnJvbnRtYXR0ZXJSYW5nZSAmJiBmcm9udG1hdHRlclJhbmdlICE9PSBcImludmFsaWRcIlxuICAgICAgICA/IGdldEV4aXN0aW5nVGFnRm9ybWF0dGluZyhmcm9udG1hdHRlclJhbmdlLmJvZHkpXG4gICAgICAgIDogXCJ1bmtub3duXCI7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZyb250bWF0dGVyKSA9PiB7XG4gICAgICAgICAgY29uc3QgbWVyZ2VkVGFncyA9IGpvaW5UYWdWYWx1ZXMoZXh0cmFjdEV4aXN0aW5nVGFncyhmcm9udG1hdHRlci50YWdzKSwgdGFncyk7XG4gICAgICAgICAgaWYgKG1lcmdlZFRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBkZWxldGUgZnJvbnRtYXR0ZXIudGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZm9ybWF0ID09PSBcImNvbW1hXCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZvcm1hdCA9PT0gXCJzcGFjZVwiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZnJvbnRtYXR0ZXIudGFncykgfHwgZm9ybWF0ID09PSBcImFycmF5XCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnRhZ3MgPT09IFwic3RyaW5nXCIgfHwgZm9ybWF0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5sZW5ndGggPT09IDEgPyBtZXJnZWRUYWdzWzBdIDogbWVyZ2VkVGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3MubGVuZ3RoID09PSAxID8gbWVyZ2VkVGFnc1swXSA6IG1lcmdlZFRhZ3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBgU2tpcHBlZCB0YWdnaW5nIHNvdXJjZSBmaWxlICR7ZmlsZS5wYXRofTogaW52YWxpZCBmcm9udG1hdHRlci5gO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGNvbnRlbnQ6IHN0cmluZywgdGFnczogc3RyaW5nW10pOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXJSYW5nZSA9IGNvbGxlY3RGcm9udG1hdHRlclJhbmdlKGNvbnRlbnQpO1xuICAgIGlmIChmcm9udG1hdHRlclJhbmdlID09PSBcImludmFsaWRcIikge1xuICAgICAgcmV0dXJuIHsgY29udGVudCwgd2FybmluZzogXCJpbnZhbGlkIGZyb250bWF0dGVyLlwiIH07XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbGRGcm9udG1hdHRlciA9IChmcm9udG1hdHRlckJvZHk6IHN0cmluZyB8IG51bGwpOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCA9PiB7XG4gICAgICBjb25zdCBmb3JtYXQgPSBmcm9udG1hdHRlckJvZHkgPyBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJCb2R5KSA6IFwidW5rbm93blwiO1xuICAgICAgbGV0IHBhcnNlZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcnNlZCA9IGZyb250bWF0dGVyQm9keSA/ICgocGFyc2VZYW1sKGZyb250bWF0dGVyQm9keSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID8/IHt9KSA6IHt9O1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQsIHdhcm5pbmc6IFwiaW52YWxpZCBmcm9udG1hdHRlci5cIiB9O1xuICAgICAgfVxuICAgICAgY29uc3QgbWVyZ2VkVGFncyA9IGpvaW5UYWdWYWx1ZXMoZXh0cmFjdEV4aXN0aW5nVGFncyhwYXJzZWQudGFncyksIHRhZ3MpO1xuICAgICAgaWYgKG1lcmdlZFRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQgfTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZC50YWdzKSkge1xuICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3M7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJzZWQudGFncyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAoZm9ybWF0ID09PSBcImNvbW1hXCIpIHtcbiAgICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiwgXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gXCJzcGFjZVwiKSB7XG4gICAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIgXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMSA/IG1lcmdlZFRhZ3NbMF0gOiBtZXJnZWRUYWdzO1xuICAgICAgfVxuICAgICAgY29uc3QgeWFtbEJvZHkgPSBzdHJpbmdpZnlZYW1sKHBhcnNlZCkudHJpbUVuZCgpO1xuICAgICAgY29uc3QgbmV4dEZyb250bWF0dGVyID0gYC0tLVxcbiR7eWFtbEJvZHl9XFxuLS0tXFxuYDtcbiAgICAgIGlmICghZnJvbnRtYXR0ZXJSYW5nZSkge1xuICAgICAgICByZXR1cm4geyBjb250ZW50OiBgJHtuZXh0RnJvbnRtYXR0ZXJ9JHtjb250ZW50fWAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IGAke25leHRGcm9udG1hdHRlcn0ke2NvbnRlbnQuc2xpY2UoZnJvbnRtYXR0ZXJSYW5nZS5yYW5nZVsxXSl9YCxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGlmICghZnJvbnRtYXR0ZXJSYW5nZSkge1xuICAgICAgcmV0dXJuIGJ1aWxkRnJvbnRtYXR0ZXIobnVsbCk7XG4gICAgfVxuICAgIHJldHVybiBidWlsZEZyb250bWF0dGVyKGZyb250bWF0dGVyUmFuZ2UuYm9keSk7XG4gIH1cblxuICBwcml2YXRlIGdldFRhZ3NGb3JNb2RlKG1vZGU6IFRyYW5zZmVyTW9kZSk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gY2xlYW5UYWdJbnB1dChtb2RlID09PSBcImNvcHlcIiA/IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JDb3BpZWRFbGVtZW50cyA6IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JNb3ZlZEVsZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGVsZXRlTW92ZWRTb3VyY2VzKHRyYW5zZmVycmVkRmlsZXM6IFRGaWxlW10sIHNlbGVjdGVkRm9sZGVyUGF0aHM6IHN0cmluZ1tdLCBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnkpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHVuaXF1ZUZpbGVzID0gWy4uLm5ldyBNYXAodHJhbnNmZXJyZWRGaWxlcy5tYXAoKGZpbGUpID0+IFtmaWxlLnBhdGgsIGZpbGVdKSkudmFsdWVzKCldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5wYXRoLmxlbmd0aCAtIGxlZnQucGF0aC5sZW5ndGgpO1xuICAgIGxldCBkZWxldGVkQ291bnQgPSAwO1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHVuaXF1ZUZpbGVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGZpbGUucGF0aCk7XG4gICAgICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZGVsZXRlKGN1cnJlbnRGaWxlKTtcbiAgICAgICAgZGVsZXRlZENvdW50ICs9IDE7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5LmZhaWxlZENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIGRlbGV0ZSBzb3VyY2UgZmlsZSAke2ZpbGUucGF0aH06ICR7dGhpcy50b0Vycm9yTWVzc2FnZShlcnJvciwgXCJDb3VsZCBub3QgZGVsZXRlIHNvdXJjZSBmaWxlLlwiKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzb3J0ZWRGb2xkZXJzID0gWy4uLnNlbGVjdGVkRm9sZGVyUGF0aHNdLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5sZW5ndGggLSBsZWZ0Lmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBmb2xkZXJQYXRoIG9mIHNvcnRlZEZvbGRlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGb2xkZXJCeVBhdGgoZm9sZGVyUGF0aCk7XG4gICAgICAgIGlmICghZm9sZGVyIHx8IGZvbGRlci5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmRlbGV0ZShmb2xkZXIsIHRydWUpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBGYWlsZWQgdG8gZGVsZXRlIHNvdXJjZSBmb2xkZXIgJHtmb2xkZXJQYXRofTogJHt0aGlzLnRvRXJyb3JNZXNzYWdlKGVycm9yLCBcIkNvdWxkIG5vdCBkZWxldGUgc291cmNlIGZvbGRlci5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGV0ZWRDb3VudDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcGF0aEV4aXN0cyhjYW5kaWRhdGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKGNhbmRpZGF0ZVBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kQXZhaWxhYmxlUGF0aChjYW5kaWRhdGVQYXRoOiBzdHJpbmcsIHJlc2VydmVkUGF0aHM6IFNldDxzdHJpbmc+LCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhdGgucGFyc2UoY2FuZGlkYXRlUGF0aCk7XG4gICAgbGV0IGluZGV4ID0gMTtcbiAgICBsZXQgbmV4dFBhdGggPSBjYW5kaWRhdGVQYXRoO1xuICAgIHdoaWxlIChyZXNlcnZlZFBhdGhzLmhhcyhuZXh0UGF0aCkgfHwgYXdhaXQgdGhpcy5wYXRoRXhpc3RzKG5leHRQYXRoKSB8fCBuZXh0UGF0aCA9PT0gc291cmNlUGF0aCkge1xuICAgICAgbmV4dFBhdGggPSBwYXRoLmpvaW4ocGFyc2VkLmRpciwgYCR7cGFyc2VkLm5hbWV9ICR7aW5kZXh9JHtwYXJzZWQuZXh0fWApO1xuICAgICAgaW5kZXggKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHRQYXRoO1xuICB9XG5cbiAgcHJpdmF0ZSB0b0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93biwgZmFsbGJhY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogZmFsbGJhY2s7XG4gIH1cbn1cblxuY2xhc3MgVGFyZ2V0VmF1bHRTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxEZXN0aW5hdGlvbkNvbmZpZz4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldHM6IERlc3RpbmF0aW9uQ29uZmlnW10sXG4gICAgcGxhY2Vob2xkZXI6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uQ2hvb3NlVGFyZ2V0OiAodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZykgPT4gdm9pZCxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKHBsYWNlaG9sZGVyKTtcbiAgICB0aGlzLmVtcHR5U3RhdGVUZXh0ID0gXCJObyBkZXN0aW5hdGlvbiB2YXVsdHMgYXZhaWxhYmxlLlwiO1xuICB9XG5cbiAgZ2V0SXRlbXMoKTogRGVzdGluYXRpb25Db25maWdbXSB7XG4gICAgcmV0dXJuIHRoaXMudGFyZ2V0cztcbiAgfVxuXG4gIGdldEl0ZW1UZXh0KHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBzdHJpbmcge1xuICAgIHJldHVybiBnZXREZXN0aW5hdGlvbkRpc3BsYXlOYW1lKHRhcmdldCk7XG4gIH1cblxuICByZW5kZXJTdWdnZXN0aW9uKG1hdGNoOiBGdXp6eU1hdGNoPERlc3RpbmF0aW9uQ29uZmlnPiwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gbWF0Y2guaXRlbTtcbiAgICBlbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1zdWdnZXN0LXRpdGxlXCIsIHRleHQ6IGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0KSB9KTtcbiAgICBjb25zdCBkZXRhaWwgPSBbdGFyZ2V0LnZhdWx0UGF0aC50cmltKCksIHRhcmdldC5kZXN0aW5hdGlvblBhdGgudHJpbSgpXS5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKS5qb2luKFwiIC0+IFwiKTtcbiAgICBpZiAoZGV0YWlsLmxlbmd0aCA+IDApIHtcbiAgICAgIGVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXN1Z2dlc3QtZGV0YWlsXCIsIHRleHQ6IGRldGFpbCB9KTtcbiAgICB9XG4gIH1cblxuICBvbkNob29zZUl0ZW0odGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIHRoaXMub25DaG9vc2VUYXJnZXQodGFyZ2V0KTtcbiAgfVxufVxuXG5jbGFzcyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBzZWxlY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVFbGVtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW5wdXRFbGVtZW50PigpO1xuICBwcml2YXRlIHJlc29sdmVQcm9taXNlOiAoKHJlc3VsdDogUmV2aWV3TW9kYWxSZXN1bHQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSByb290czogUmV2aWV3Tm9kZVtdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29uZmxpY3RTdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2Ygcm9vdHMpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU5vZGVTdGF0ZShyb290KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB3YWl0Rm9yUmVzdWx0KCk6IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcInRyYW5zdmF1bHQtcmV2aWV3LW1vZGFsXCIpO1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiUmV2aWV3IGxpbmtlZCBub3Rlc1wiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IGNvbmZsaWN0Tm90aWNlID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LW5vdGljZVwiIH0pO1xuICAgIGNvbmZsaWN0Tm90aWNlLmNyZWF0ZVNwYW4oe1xuICAgICAgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LWJhZGdlXCIsXG4gICAgICB0ZXh0OiBgQ29uZmxpY3QgaGFuZGxpbmc6ICR7Z2V0Q29uZmxpY3RTdHJhdGVneUxhYmVsKHRoaXMuY29uZmxpY3RTdHJhdGVneSl9YCxcbiAgICB9KTtcbiAgICBjb25mbGljdE5vdGljZS5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LXRleHRcIixcbiAgICAgIHRleHQ6IGdldENvbmZsaWN0U3RyYXRlZ3lEZXNjcmlwdGlvbih0aGlzLmNvbmZsaWN0U3RyYXRlZ3kpLFxuICAgIH0pO1xuICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlJldmlldyBkaXJlY3QgbGlua3MgYW5kIGJhY2tsaW5rcyBmb3IgdGhlIHNlbGVjdGVkIE1hcmtkb3duIG5vdGVzLiBUaGUgdHJhbnNmZXIgaW5jbHVkZXMgZXZlcnkgbm90ZSBpbnN0YW5jZSB0aGF0IHJlbWFpbnMgc2VsZWN0ZWQuXCIsXG4gICAgfSk7XG4gICAgY29uc3QgdHJlZSA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy10cmVlXCIgfSk7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVuZGVyTm9kZSh0cmVlLCByb290LCAwKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aW9ucyA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIgfSk7XG4gICAgY29uc3QgY2FuY2VsQnV0dG9uID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FuY2VsXCIgfSk7XG4gICAgY2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICB0aGlzLmZpbmlzaCh7IGNvbmZpcm1lZDogZmFsc2UsIHNlbGVjdGVkUGF0aHM6IFtdIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJUcmFuc2ZlciBzZWxlY3RlZCBpdGVtc1wiIH0pO1xuICAgIGNvbmZpcm1CdXR0b24uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgIGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIHRoaXMuZmluaXNoKHtcbiAgICAgICAgY29uZmlybWVkOiB0cnVlLFxuICAgICAgICBzZWxlY3RlZFBhdGhzOiBbLi4udGhpcy5nZXRTZWxlY3RlZFBhdGhzKCldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yZXNvbHZlUHJvbWlzZSkge1xuICAgICAgdGhpcy5maW5pc2goeyBjb25maXJtZWQ6IGZhbHNlLCBzZWxlY3RlZFBhdGhzOiBbXSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGZpbmlzaChyZXN1bHQ6IFJldmlld01vZGFsUmVzdWx0KTogdm9pZCB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVzb2x2ZVByb21pc2U7XG4gICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IG51bGw7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHJlc29sdmU/LihyZXN1bHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplTm9kZVN0YXRlKG5vZGU6IFJldmlld05vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICB0aGlzLnNlbGVjdGlvblN0YXRlLnNldChub2RlLmlkLCB0cnVlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVOb2RlU3RhdGUoY2hpbGQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyTm9kZShjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIG5vZGU6IFJldmlld05vZGUsIGRlcHRoOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBpdGVtID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LW5vZGVcIiB9KTtcbiAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KFwiLS10cmFuc3ZhdWx0LWRlcHRoXCIsIFN0cmluZyhkZXB0aCkpO1xuICAgIGNvbnN0IHJvdyA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LXJvd1wiIH0pO1xuICAgIHJvdy5hZGRDbGFzcyhgdHJhbnN2YXVsdC1yZXZpZXctcm93LSR7bm9kZS50eXBlfWApO1xuICAgIGNvbnN0IGNoZWNrYm94U2hlbGwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LWNoZWNrYm94LXNoZWxsXCIgfSk7XG4gICAgY29uc3QgY2hlY2tib3ggPSBjaGVja2JveFNoZWxsLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcImNoZWNrYm94XCIgfSk7XG4gICAgdGhpcy5ub2RlRWxlbWVudHMuc2V0KG5vZGUuaWQsIGNoZWNrYm94KTtcbiAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlTm9kZShub2RlLCBjaGVja2JveC5jaGVja2VkKTtcbiAgICAgIHRoaXMucmVmcmVzaFRyZWUoKTtcbiAgICB9KTtcbiAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveFNoZWxsLmNyZWF0ZVNwYW4oeyBjbHM6IFwidHJhbnN2YXVsdC1jaGVjay1pbmRpY2F0b3JcIiB9KTtcbiAgICBjb25zdCBpY29uRWwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy1pY29uXCIgfSk7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICBpZiAobm9kZS5kaXJlY3Rpb24pIHtcbiAgICAgICAgc2V0SWNvbihpY29uRWwsIG5vZGUuZGlyZWN0aW9uID09PSBcInRvXCIgPyBcImxpbmtzLWdvaW5nLW91dFwiIDogXCJsaW5rcy1jb21pbmctaW5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldEljb24oaWNvbkVsLCBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgPyBcImZpbGUtdGV4dFwiIDogXCJmaWxlXCIpO1xuICAgIH1cbiAgICBjb25zdCBsYWJlbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWxhYmVsXCIsIHRleHQ6IG5vZGUubGFiZWwgfSk7XG4gICAgbGFiZWwuYWRkQ2xhc3MoYHRyYW5zdmF1bHQtcmV2aWV3LWxhYmVsLSR7bm9kZS50eXBlfWApO1xuXG4gICAgY29uc3QgY2hpbGRyZW5Db250YWluZXIgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy1jaGlsZHJlblwiIH0pO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKGNoaWxkcmVuQ29udGFpbmVyLCBjaGlsZCwgZGVwdGggKyAxKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDaGVja2JveChub2RlLCBjaGVja2JveCwgaW5kaWNhdG9yKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFRyZWUoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUocm9vdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoTm9kZShub2RlOiBSZXZpZXdOb2RlKTogdm9pZCB7XG4gICAgY29uc3QgY2hlY2tib3ggPSB0aGlzLm5vZGVFbGVtZW50cy5nZXQobm9kZS5pZCk7XG4gICAgaWYgKGNoZWNrYm94KSB7XG4gICAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveC5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi50cmFuc3ZhdWx0LWNoZWNrLWluZGljYXRvclwiKSA/PyBudWxsO1xuICAgICAgaWYgKGluZGljYXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUNoZWNrYm94KG5vZGUsIGNoZWNrYm94LCBpbmRpY2F0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUoY2hpbGQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQ2hlY2tib3gobm9kZTogUmV2aWV3Tm9kZSwgY2hlY2tib3g6IEhUTUxJbnB1dEVsZW1lbnQsIGluZGljYXRvcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuZ2V0Tm9kZVN0YXR1cyhub2RlKTtcbiAgICBjaGVja2JveC5jaGVja2VkID0gc3RhdGUgPT09IFwiY2hlY2tlZFwiO1xuICAgIGNoZWNrYm94LmluZGV0ZXJtaW5hdGUgPSBzdGF0ZSA9PT0gXCJtaXhlZFwiO1xuICAgIGluZGljYXRvci50ZXh0Q29udGVudCA9IHN0YXRlID09PSBcIm1peGVkXCIgPyBcIi1cIiA6IFwiXCI7XG4gICAgaW5kaWNhdG9yLnRvZ2dsZUNsYXNzKFwiaXMtdmlzaWJsZVwiLCBzdGF0ZSA9PT0gXCJtaXhlZFwiKTtcbiAgICBjaGVja2JveC5kYXRhc2V0LnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICBwcml2YXRlIGdldE5vZGVTdGF0dXMobm9kZTogUmV2aWV3Tm9kZSk6IFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIiB7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21iaW5lU3RhdHVzZXMobm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkKSA9PiB0aGlzLmdldE5vZGVTdGF0dXMoY2hpbGQpKSk7XG4gICAgfVxuICAgIGNvbnN0IHNlbGZTZWxlY3RlZCA9IHRoaXMuc2VsZWN0aW9uU3RhdGUuZ2V0KG5vZGUuaWQpID8/IGZhbHNlO1xuICAgIGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNlbGZTZWxlY3RlZCA/IFwiY2hlY2tlZFwiIDogXCJ1bmNoZWNrZWRcIjtcbiAgICB9XG4gICAgY29uc3QgY2hpbGRTdGF0dXMgPSB0aGlzLmNvbWJpbmVTdGF0dXNlcyhub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQpID0+IHRoaXMuZ2V0Tm9kZVN0YXR1cyhjaGlsZCkpKTtcbiAgICBpZiAoc2VsZlNlbGVjdGVkICYmIGNoaWxkU3RhdHVzID09PSBcImNoZWNrZWRcIikge1xuICAgICAgcmV0dXJuIFwiY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoIXNlbGZTZWxlY3RlZCAmJiBjaGlsZFN0YXR1cyA9PT0gXCJ1bmNoZWNrZWRcIikge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIHJldHVybiBcIm1peGVkXCI7XG4gIH1cblxuICBwcml2YXRlIGNvbWJpbmVTdGF0dXNlcyhzdGF0dXNlczogQXJyYXk8XCJjaGVja2VkXCIgfCBcInVuY2hlY2tlZFwiIHwgXCJtaXhlZFwiPik6IFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIiB7XG4gICAgaWYgKHN0YXR1c2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIGlmIChzdGF0dXNlcy5ldmVyeSgoc3RhdHVzKSA9PiBzdGF0dXMgPT09IFwiY2hlY2tlZFwiKSkge1xuICAgICAgcmV0dXJuIFwiY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoc3RhdHVzZXMuZXZlcnkoKHN0YXR1cykgPT4gc3RhdHVzID09PSBcInVuY2hlY2tlZFwiKSkge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIHJldHVybiBcIm1peGVkXCI7XG4gIH1cblxuICBwcml2YXRlIHRvZ2dsZU5vZGUobm9kZTogUmV2aWV3Tm9kZSwgY2hlY2tlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmIChub2RlLnR5cGUgPT09IFwibm90ZVwiIHx8IG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uU3RhdGUuc2V0KG5vZGUuaWQsIGNoZWNrZWQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMudG9nZ2xlTm9kZShjaGlsZCwgY2hlY2tlZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTZWxlY3RlZFBhdGhzKCk6IFNldDxzdHJpbmc+IHtcbiAgICBjb25zdCBzZWxlY3RlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgcm9vdCBvZiB0aGlzLnJvb3RzKSB7XG4gICAgICB0aGlzLmNvbGxlY3RTZWxlY3RlZFBhdGhzKHJvb3QsIHNlbGVjdGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGVjdGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0U2VsZWN0ZWRQYXRocyhub2RlOiBSZXZpZXdOb2RlLCBzaW5rOiBTZXQ8c3RyaW5nPik6IHZvaWQge1xuICAgIGlmICgobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSAmJiBub2RlLmZpbGVQYXRoICYmICh0aGlzLnNlbGVjdGlvblN0YXRlLmdldChub2RlLmlkKSA/PyBmYWxzZSkpIHtcbiAgICAgIHNpbmsuYWRkKG5vZGUuZmlsZVBhdGgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMuY29sbGVjdFNlbGVjdGVkUGF0aHMoY2hpbGQsIHNpbmspO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBUcmFuc1ZhdWx0U2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4sIHByaXZhdGUgcmVhZG9ubHkgZGVzdGluYXRpb25SZXNvbHZlcjogRGVzdGluYXRpb25SZXNvbHZlcikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuXG4gICAgdGhpcy5hZGREcm9wZG93blNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiQ29uZmxpY3QgaGFuZGxpbmdcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGV0aGVyIGV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIGFyZSBza2lwcGVkLCByZW5hbWVkIGF1dG9tYXRpY2FsbHksIG9yIG92ZXJ3cml0dGVuLlwiLFxuICAgICAgb3B0aW9uczogKE9iamVjdC5lbnRyaWVzKENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBKSBhcyBBcnJheTxbQ29uZmxpY3RTdHJhdGVneSwgdHlwZW9mIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW0NvbmZsaWN0U3RyYXRlZ3ldXT4pXG4gICAgICAgIC5tYXAoKFt2YWx1ZSwgbWV0YV0pID0+ICh7IHZhbHVlLCBsYWJlbDogbWV0YS5sYWJlbCB9KSksXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRvZ2dsZVNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiSW5jbHVkZSBsaW5rZWQgZmlsZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgZGlyZWN0bHkgcmVsYXRlZCBub3RlcyBhbmQgbGlua2VkIG5vbi1NYXJrZG93biBmaWxlcyBmcm9tIHNlbGVjdGVkIG5vdGVzLlwiLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5jbHVkZUxpbmtlZEZpbGVzID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkRHJvcGRvd25TZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlJldmlldyBkaWFsb2dcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGVuIHRvIHNob3cgdGhlIHRyYW5zZmVyIHJldmlldyBkaWFsb2cuXCIsXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHsgdmFsdWU6IFwiYWx3YXlzXCIsIGxhYmVsOiBcIkFsd2F5c1wiIH0sXG4gICAgICAgIHsgdmFsdWU6IFwibGlua2VkLW9ubHlcIiwgbGFiZWw6IFwiT25seSB3aGVuIG5vdGVzIGFyZSBsaW5rZWRcIiB9LFxuICAgICAgICB7IHZhbHVlOiBcIm5ldmVyXCIsIGxhYmVsOiBcIk5ldmVyXCIgfSxcbiAgICAgIF0sXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlRhZ3MgZm9yIGNvcGllZCBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBjb3B5aW5nLlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IFwiY29waWVkLCBzZW50XCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0ZvckNvcGllZEVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yQ29waWVkRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIkFsc28gdGFnIGNvcGllZCBzb3VyY2Ugbm90ZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIldyaXRlIHRoZSBjb25maWd1cmVkIGNvcHkgdGFncyBiYWNrIGludG8gc291cmNlIE1hcmtkb3duIGZpbGVzIGluIHRoZSBhY3RpdmUgdmF1bHQuXCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJUYWdzIGZvciBtb3ZlZCBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBtb3ZpbmcuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogXCJtb3ZlZCwgYXJjaGl2ZWRcIixcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yTW92ZWRFbGVtZW50cyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0Zvck1vdmVkRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJEZXN0aW5hdGlvbiB2YXVsdHNcIikuc2V0SGVhZGluZygpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlVzZSBhYnNvbHV0ZSBwYXRocy4gRGVzdGluYXRpb24gYW5kIGF0dGFjaG1lbnQgcGF0aHMgbXVzdCBzdGF5IGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQgcm9vdC5cIixcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMpIHtcbiAgICAgIHRoaXMucmVuZGVyRGVzdGluYXRpb25DYXJkKGNvbnRhaW5lckVsLCB0YXJnZXQpO1xuICAgIH1cblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBZGQgZGVzdGluYXRpb25cIilcbiAgICAgIC5zZXREZXNjKFwiQ3JlYXRlIGFub3RoZXIgZGVzdGluYXRpb24gdmF1bHQgY29uZmlndXJhdGlvbi5cIilcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkFkZCBkZXN0aW5hdGlvblwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRzLnB1c2goY3JlYXRlQmxhbmtEZXN0aW5hdGlvbigpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRGVzdGluYXRpb25DYXJkKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC10YXJnZXQtY2FyZFwiIH0pO1xuICAgIGNvbnN0IHZhbGlkYXRpb25Ib3N0ID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC10YXJnZXQtdmFsaWRhdGlvblwiIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjYXJkLCB7XG4gICAgICBuYW1lOiBcIkRlc3RpbmF0aW9uIG5hbWVcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkxhYmVsIHNob3duIGluIGRlc3RpbmF0aW9uIHNlbGVjdGlvbiBtZW51cy5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiBnZXREZXN0aW5hdGlvbkRpc3BsYXlOYW1lKHRhcmdldCksXG4gICAgICB2YWx1ZTogdGFyZ2V0Lm5hbWUsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC5uYW1lID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiRGVzdGluYXRpb24gdmF1bHQgcGF0aFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBvZiB0aGUgZGVzdGluYXRpb24gdmF1bHQuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0XCIpLFxuICAgICAgdmFsdWU6IHRhcmdldC52YXVsdFBhdGgsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC52YXVsdFBhdGggPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIGlmICh0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRGV0ZWN0ZWRBdHRhY2htZW50UGF0aCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY2FyZCwge1xuICAgICAgbmFtZTogXCJEZXN0aW5hdGlvbiBwYXRoXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJBYnNvbHV0ZSBwYXRoIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQgd2hlcmUgY29waWVkIGFuZCBtb3ZlZCBjb250ZW50IHdpbGwgbGFuZC5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiB0aGlzLmV4YW1wbGVQYXRoKFwiVmF1bHQvSW5ib3hcIiksXG4gICAgICB2YWx1ZTogdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiVXNlIGRlZmF1bHQgYXR0YWNobWVudCBsb2NhdGlvblwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiUmVhZCAub2JzaWRpYW4vYXBwLmpzb24gaW4gdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGFuZCByZXNvbHZlIHRoZSBhdHRhY2htZW50IGZvbGRlciBhdXRvbWF0aWNhbGx5LlwiLFxuICAgICAgdmFsdWU6IHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiA9IHZhbHVlO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZURldGVjdGVkQXR0YWNobWVudFBhdGgodGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWRpc3BsYXkoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoIXRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uKSB7XG4gICAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgICAgbmFtZTogXCJBdHRhY2htZW50IHBhdGhcIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGZvciBsaW5rZWQgbm9uLU1hcmtkb3duIGZpbGVzLlwiLFxuICAgICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0L0F0dGFjaG1lbnRzXCIpLFxuICAgICAgICB2YWx1ZTogdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLFxuICAgICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuXG4gICAgbmV3IFNldHRpbmcoY2FyZCkuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlXCIpLnNldFdhcm5pbmcoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKChlbnRyeSkgPT4gZW50cnkuaWQgIT09IHRhcmdldC5pZCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZGlzcGxheSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFkZFRleHRTZXR0aW5nKFxuICAgIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBjb25maWc6IHtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICBwbGFjZWhvbGRlcjogc3RyaW5nO1xuICAgICAgdmFsdWU6IHN0cmluZztcbiAgICAgIG9uQ2hhbmdlOiAodmFsdWU6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICB9LFxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKGNvbmZpZy5uYW1lKVxuICAgICAgLnNldERlc2MoY29uZmlnLmRlc2NyaXB0aW9uKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRQbGFjZWhvbGRlcihjb25maWcucGxhY2Vob2xkZXIpLnNldFZhbHVlKGNvbmZpZy52YWx1ZSkub25DaGFuZ2UoY29uZmlnLm9uQ2hhbmdlKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRUb2dnbGVTZXR0aW5nKFxuICAgIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBjb25maWc6IHtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogYm9vbGVhbjtcbiAgICAgIG9uQ2hhbmdlOiAodmFsdWU6IGJvb2xlYW4pID0+IFByb21pc2U8dm9pZD47XG4gICAgfSxcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShjb25maWcubmFtZSlcbiAgICAgIC5zZXREZXNjKGNvbmZpZy5kZXNjcmlwdGlvbilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUoY29uZmlnLnZhbHVlKS5vbkNoYW5nZShjb25maWcub25DaGFuZ2UpO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFkZERyb3Bkb3duU2V0dGluZzxUIGV4dGVuZHMgc3RyaW5nPihcbiAgICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgICAgb3B0aW9uczogQXJyYXk8eyB2YWx1ZTogVDsgbGFiZWw6IHN0cmluZyB9PjtcbiAgICAgIHZhbHVlOiBUO1xuICAgICAgb25DaGFuZ2U6ICh2YWx1ZTogVCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICB9LFxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKGNvbmZpZy5uYW1lKVxuICAgICAgLnNldERlc2MoY29uZmlnLmRlc2NyaXB0aW9uKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBjb25maWcub3B0aW9ucykge1xuICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihvcHRpb24udmFsdWUsIG9wdGlvbi5sYWJlbCk7XG4gICAgICAgIH1cbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLnZhbHVlKS5vbkNoYW5nZSgodmFsdWUpID0+IGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSBhcyBUKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZUFuZFJlZGlzcGxheSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvbihjb250YWluZXJFbCwgdGFyZ2V0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVmFsaWRhdGlvbihjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci52YWxpZGF0ZSh0YXJnZXQpO1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAodGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24gJiYgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBgRGV0ZWN0ZWQgYXR0YWNobWVudCBwYXRoOiAke3RhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCl9YCB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBlcnJvciBvZiBlcnJvcnMpIHtcbiAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBlcnJvciB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZURldGVjdGVkQXR0YWNobWVudFBhdGgodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRWYXVsdFBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC52YXVsdFBhdGgpO1xuICAgIGlmICghcGF0aC5pc0Fic29sdXRlKG5vcm1hbGl6ZWRWYXVsdFBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRhcmdldC5hdHRhY2htZW50UGF0aCA9IGF3YWl0IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci5yZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKG5vcm1hbGl6ZWRWYXVsdFBhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGFtcGxlUGF0aChzdWZmaXg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIiA/IGBDOlxcXFwke3N1ZmZpeC5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpfWAgOiBgL1VzZXJzL2V4YW1wbGUvJHtzdWZmaXgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIil9YDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmFuc1ZhdWx0UGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFRyYW5zVmF1bHRTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdGluYXRpb25SZXNvbHZlciA9IG5ldyBEZXN0aW5hdGlvblJlc29sdmVyKCk7XG4gIHByaXZhdGUgcGxhbm5lciA9IG5ldyBUcmFuc2ZlclBsYW5uZXIodGhpcywgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyKTtcbiAgcHJpdmF0ZSBleGVjdXRvciA9IG5ldyBUcmFuc2ZlckV4ZWN1dG9yKHRoaXMpO1xuICBwcml2YXRlIG5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIVBsYXRmb3JtLmlzRGVza3RvcEFwcCkge1xuICAgICAgbmV3IE5vdGljZShcIlRyYW5zIFZhdWx0IGlzIGF2YWlsYWJsZSBvbmx5IG9uIGRlc2t0b3AuXCIsIDEwMDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgVHJhbnNWYXVsdFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMsIHRoaXMuZGVzdGluYXRpb25SZXNvbHZlcikpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21tYW5kcygpO1xuICAgIHRoaXMucmVnaXN0ZXJDb250ZXh0TWVudXMoKTtcbiAgICB0aGlzLnJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHN0b3JlZCA9IChhd2FpdCB0aGlzLmxvYWREYXRhKCkpIGFzIChQYXJ0aWFsPFRyYW5zVmF1bHRTZXR0aW5ncz4gJiB7IHNob3dSZXZpZXdEaWFsb2c/OiBib29sZWFuIH0pIHwgbnVsbDtcbiAgICBjb25zdCBtaWdyYXRlZFJldmlld0RpYWxvZ01vZGU6IFJldmlld0RpYWxvZ01vZGUgfCB1bmRlZmluZWQgPSBzdG9yZWQ/LnJldmlld0RpYWxvZ01vZGVcbiAgICAgID8/ICh0eXBlb2Ygc3RvcmVkPy5zaG93UmV2aWV3RGlhbG9nID09PSBcImJvb2xlYW5cIlxuICAgICAgICA/IChzdG9yZWQuc2hvd1Jldmlld0RpYWxvZyA/IFwibGlua2VkLW9ubHlcIiA6IFwibmV2ZXJcIilcbiAgICAgICAgOiB1bmRlZmluZWQpO1xuICAgIHRoaXMuc2V0dGluZ3MgPSB7XG4gICAgICAuLi5ERUZBVUxUX1NFVFRJTkdTLFxuICAgICAgLi4uc3RvcmVkLFxuICAgICAgcmV2aWV3RGlhbG9nTW9kZTogbWlncmF0ZWRSZXZpZXdEaWFsb2dNb2RlID8/IERFRkFVTFRfU0VUVElOR1MucmV2aWV3RGlhbG9nTW9kZSxcbiAgICAgIHRhcmdldHM6IChzdG9yZWQ/LnRhcmdldHMgPz8gW10pLm1hcCgodGFyZ2V0KSA9PiAoe1xuICAgICAgICAuLi5jcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCksXG4gICAgICAgIC4uLnRhcmdldCxcbiAgICAgICAgaWQ6IHRhcmdldC5pZCA/PyBjcmVhdGVEZXN0aW5hdGlvbklkKCksXG4gICAgICB9KSksXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRoaXMuc2V0dGluZ3MudGFyZ2V0cykge1xuICAgICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LnZhdWx0UGF0aCk7XG4gICAgICBpZiAodGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24gJiYgcGF0aC5pc0Fic29sdXRlKG5vcm1hbGl6ZWRWYXVsdFBhdGgpKSB7XG4gICAgICAgIHRhcmdldC5hdHRhY2htZW50UGF0aCA9IGF3YWl0IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci5yZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKG5vcm1hbGl6ZWRWYXVsdFBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckNvbW1hbmRzKCk6IHZvaWQge1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJjb3B5LWFjdGl2ZS1maWxlLXRvLXZhdWx0XCIsXG4gICAgICBuYW1lOiBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBLmNvcHkuY29tbWFuZE5hbWUsXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHRoaXMuaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQoXCJjb3B5XCIsIGNoZWNraW5nKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwibW92ZS1hY3RpdmUtZmlsZS10by12YXVsdFwiLFxuICAgICAgbmFtZTogVFJBTlNGRVJfTU9ERV9NRVRBREFUQS5tb3ZlLmNvbW1hbmROYW1lLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB0aGlzLmhhbmRsZUFjdGl2ZUZpbGVDb21tYW5kKFwibW92ZVwiLCBjaGVja2luZyksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUFjdGl2ZUZpbGVDb21tYW5kKG1vZGU6IFRyYW5zZmVyTW9kZSwgY2hlY2tpbmc6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGNoZWNraW5nKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgW2FjdGl2ZUZpbGVdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJDb250ZXh0TWVudXMoKTogdm9pZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5hcHAud29ya3NwYWNlIGFzIGFueTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQod29ya3NwYWNlLm9uKFwiZmlsZS1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIFtmaWxlXSk7XG4gICAgfSkpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh3b3Jrc3BhY2Uub24oXCJmaWxlcy1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlczogVEFic3RyYWN0RmlsZVtdKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIGZpbGVzKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnRyeVJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JNZW51cygpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk7XG4gICAgfSkpO1xuXG4gICAgaWYgKCF0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICB0aGlzLm5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgdGhpcy50cnlSZWdpc3Rlck5vdGVib29rTmF2aWdhdG9yTWVudXMoKTtcbiAgICAgIH0sIDIwMDApO1xuICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vdGVib29rTmF2aWdhdG9yID0gKCh0aGlzLmFwcCBhcyB1bmtub3duIGFzIHsgcGx1Z2lucz86IHsgcGx1Z2lucz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0gfSkucGx1Z2lucz8ucGx1Z2lucz8uW1wibm90ZWJvb2stbmF2aWdhdG9yXCJdIGFzIHtcbiAgICAgIGFwaT86IHtcbiAgICAgICAgbWVudXM/OiB7XG4gICAgICAgICAgcmVnaXN0ZXJGaWxlTWVudT86IChjYWxsYmFjazogKGNvbnRleHQ6IGFueSkgPT4gdm9pZCkgPT4gKCgpID0+IHZvaWQpIHwgdm9pZDtcbiAgICAgICAgICByZWdpc3RlckZvbGRlck1lbnU/OiAoY2FsbGJhY2s6IChjb250ZXh0OiBhbnkpID0+IHZvaWQpID0+ICgoKSA9PiB2b2lkKSB8IHZvaWQ7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0gfCB1bmRlZmluZWQpPy5hcGk7XG5cbiAgICBpZiAoIW5vdGVib29rTmF2aWdhdG9yPy5tZW51cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2VGaWxlTWVudSA9IG5vdGVib29rTmF2aWdhdG9yLm1lbnVzLnJlZ2lzdGVyRmlsZU1lbnU/LigoY29udGV4dCkgPT4ge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uID0gQXJyYXkuaXNBcnJheShjb250ZXh0LnNlbGVjdGlvbj8uZmlsZXMpID8gY29udGV4dC5zZWxlY3Rpb24uZmlsZXMgOiBbY29udGV4dC5maWxlXTtcbiAgICAgIHRoaXMuYWRkVHJhbnNmZXJNZW51SXRlbXNUb0V4dGVybmFsTWVudShjb250ZXh0LmFkZEl0ZW0sIHNlbGVjdGlvbik7XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBkaXNwb3NlRmlsZU1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRmlsZU1lbnUpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2VGb2xkZXJNZW51ID0gbm90ZWJvb2tOYXZpZ2F0b3IubWVudXMucmVnaXN0ZXJGb2xkZXJNZW51Py4oKGNvbnRleHQpID0+IHtcbiAgICAgIHRoaXMuYWRkVHJhbnNmZXJNZW51SXRlbXNUb0V4dGVybmFsTWVudShjb250ZXh0LmFkZEl0ZW0sIFtjb250ZXh0LmZvbGRlcl0pO1xuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZGlzcG9zZUZvbGRlck1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRm9sZGVyTWVudSk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgICAgdGhpcy5ub3RlYm9va05hdmlnYXRvclJldHJ5SW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRUcmFuc2Zlck1lbnVJdGVtcyhtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLnBsYW5uZXIubm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbik7XG4gICAgaWYgKG5vcm1hbGl6ZWRTZWxlY3Rpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYWRkTW9kZU1lbnVJdGVtKG1lbnUsIG5vcm1hbGl6ZWRTZWxlY3Rpb24sIFwiY29weVwiKTtcbiAgICB0aGlzLmFkZE1vZGVNZW51SXRlbShtZW51LCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogdm9pZCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbGVjdGlvbiA9IHRoaXMucGxhbm5lci5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBpZiAobm9ybWFsaXplZFNlbGVjdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcImNvcHlcIik7XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZE1vZGVNZW51SXRlbShtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgbW9kZTogVHJhbnNmZXJNb2RlKTogdm9pZCB7XG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTW9kZU1lbnVJdGVtVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCBtb2RlOiBUcmFuc2Zlck1vZGUpOiB2b2lkIHtcbiAgICBhZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uZmlndXJlVHJhbnNmZXJNZW51SXRlbShpdGVtOiBNZW51SXRlbSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10sIG1vZGU6IFRyYW5zZmVyTW9kZSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gVFJBTlNGRVJfTU9ERV9NRVRBREFUQVttb2RlXTtcbiAgICBpdGVtLnNldFRpdGxlKG1ldGFkYXRhLm1lbnVUaXRsZSkuc2V0SWNvbihtZXRhZGF0YS5pY29uKTtcbiAgICBjb25zdCBzZWxlY3RhYmxlVGFyZ2V0cyA9IHRoaXMuZ2V0U2VsZWN0YWJsZVRhcmdldHMoKTtcbiAgICBpZiAoc2VsZWN0YWJsZVRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpdGVtLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlblRhcmdldE1vZGFsKG1vZGU6IFRyYW5zZmVyTW9kZSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5nZXRTZWxlY3RhYmxlVGFyZ2V0cygpO1xuICAgIGlmICh0YXJnZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShcIkFkZCBhIGRlc3RpbmF0aW9uIHZhdWx0IGZpcnN0LlwiLCA4MDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGl0bGUgPSBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBW21vZGVdLnRhcmdldE1vZGFsVGl0bGU7XG4gICAgbmV3IFRhcmdldFZhdWx0U3VnZ2VzdE1vZGFsKHRoaXMuYXBwLCB0YXJnZXRzLCB0aXRsZSwgKHRhcmdldCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnJ1blRyYW5zZmVyKG1vZGUsIHNlbGVjdGlvbiwgdGFyZ2V0KTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGFibGVUYXJnZXRzKCk6IERlc3RpbmF0aW9uQ29uZmlnW10ge1xuICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKCh0YXJnZXQpID0+IHRhcmdldC5uYW1lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuVHJhbnNmZXIobW9kZTogVHJhbnNmZXJNb2RlLCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwbGFuID0gYXdhaXQgdGhpcy5wbGFubmVyLnByZXBhcmUoc2VsZWN0aW9uLCB0YXJnZXQpO1xuICAgICAgY29uc3QgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMgPSBhd2FpdCB0aGlzLm1heWJlUmV2aWV3UGxhbihwbGFuKTtcbiAgICAgIGlmIChjb25maXJtZWRTZWxlY3Rpb25QYXRocyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCB0aGlzLmV4ZWN1dG9yLmV4ZWN1dGUocGxhbiwgbW9kZSwgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpO1xuICAgICAgdGhpcy5zaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGUsIHN1bW1hcnkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJDb3VsZG4ndCBjb21wbGV0ZSB0aGUgdHJhbnNmZXIuXCIsIDEyMDAwKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1heWJlUmV2aWV3UGxhbihwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbik6IFByb21pc2U8c3RyaW5nW10gfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiA9IHBsYW4uZXhwbGljaXRNYXJrZG93blBhdGhzLmxlbmd0aCA+IDA7XG4gICAgY29uc3QgaGFzUmVsZXZhbnRSZWxhdGlvbnNoaXBzID0gcGxhbi5yZXZpZXdSb290cy5zb21lKChyb290KSA9PiByb290LmNoaWxkcmVuLmxlbmd0aCA+IDApO1xuICAgIGlmICghaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiB8fCB0aGlzLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUgPT09IFwibmV2ZXJcIikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9PT0gXCJsaW5rZWQtb25seVwiICYmICFoYXNSZWxldmFudFJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5ldyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgcGxhbi5yZXZpZXdSb290cywgdGhpcy5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5KS53YWl0Rm9yUmVzdWx0KCk7XG4gICAgaWYgKCFyZXN1bHQuY29uZmlybWVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5zZWxlY3RlZFBhdGhzO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGU6IFRyYW5zZmVyTW9kZSwgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5KTogdm9pZCB7XG4gICAgY29uc3QgY29tcGxldGVkQ291bnQgPSBtb2RlID09PSBcImNvcHlcIiA/IHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgOiBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50O1xuICAgIGNvbnN0IGFjdGlvbiA9IG1vZGUgPT09IFwiY29weVwiID8gXCJDb3B5IGNvbXBsZXRlXCIgOiBcIk1vdmUgY29tcGxldGVcIjtcbiAgICBjb25zdCBwYXJ0cyA9IFtgJHtjb21wbGV0ZWRDb3VudH0gb2YgJHtzdW1tYXJ5LnJlcXVlc3RlZEZpbGVDb3VudH0gaXRlbXMgdHJhbnNmZXJyZWRgXTtcbiAgICBpZiAoc3VtbWFyeS5yZW5hbWVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkucmVuYW1lZENvdW50LCBcIml0ZW0gcmVuYW1lZFwiLCBcIml0ZW1zIHJlbmFtZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCwgXCJpdGVtIHNraXBwZWRcIiwgXCJpdGVtcyBza2lwcGVkXCIpKTtcbiAgICB9XG4gICAgaWYgKHN1bW1hcnkuZmFpbGVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkuZmFpbGVkQ291bnQsIFwiaXRlbSBmYWlsZWRcIiwgXCJpdGVtcyBmYWlsZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGggPiAwICYmIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgPT09IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGgsIFwid2FybmluZ1wiLCBcIndhcm5pbmdzXCIpKTtcbiAgICB9XG5cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2VcIjtcbiAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIHRpdGxlLmNsYXNzTmFtZSA9IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZS10aXRsZVwiO1xuICAgICAgdGl0bGUudGV4dENvbnRlbnQgPSBgJHthY3Rpb259IHdpdGggd2FybmluZ3M6ICR7cGFydHMuam9pbihcIiwgXCIpfS5gO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgICAgIGNvbnN0IHNob3duRW50cmllcyA9IHN1bW1hcnkuc2tpcHBlZEVudHJpZXMuc2xpY2UoMCwgMTApO1xuICAgICAgY29uc3QgbGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiKTtcbiAgICAgIGxpc3QuY2xhc3NOYW1lID0gXCJ0cmFuc3ZhdWx0LXNraXAtbm90aWNlLWxpc3RcIjtcbiAgICAgIGZvciAoY29uc3Qgc2tpcHBlZCBvZiBzaG93bkVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgICAgICByb3cudGV4dENvbnRlbnQgPSBza2lwcGVkO1xuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICB9XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGlzdCk7XG4gICAgICBpZiAoc3VtbWFyeS5za2lwcGVkRW50cmllcy5sZW5ndGggPiBzaG93bkVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IG1vcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBtb3JlLmNsYXNzTmFtZSA9IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZS1tb3JlXCI7XG4gICAgICAgIG1vcmUudGV4dENvbnRlbnQgPSBgLi4uIGFuZCAke2Zvcm1hdENvdW50KHN1bW1hcnkuc2tpcHBlZEVudHJpZXMubGVuZ3RoIC0gc2hvd25FbnRyaWVzLmxlbmd0aCwgXCJtb3JlIHNraXBwZWQgaXRlbVwiLCBcIm1vcmUgc2tpcHBlZCBpdGVtc1wiKX0uYDtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG1vcmUpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlzbWlzc0hpbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgZGlzbWlzc0hpbnQuY2xhc3NOYW1lID0gXCJ0cmFuc3ZhdWx0LXNraXAtbm90aWNlLWRpc21pc3NcIjtcbiAgICAgIGRpc21pc3NIaW50LnRleHRDb250ZW50ID0gXCJDbGljayB0byBkaXNtaXNzXCI7XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZGlzbWlzc0hpbnQpO1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgIGNvbnN0IG5vdGljZSA9IG5ldyBOb3RpY2UoZnJhZ21lbnQsIDApIGFzIE5vdGljZSAmIHsgbm90aWNlRWw/OiBIVE1MRWxlbWVudDsgaGlkZT86ICgpID0+IHZvaWQgfTtcbiAgICAgIG5vdGljZS5ub3RpY2VFbD8uYWRkQ2xhc3MoXCJ0cmFuc3ZhdWx0LW5vdGljZS1jbGlja2FibGVcIik7XG4gICAgICBub3RpY2Uubm90aWNlRWw/LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgIG5vdGljZS5oaWRlPy4oKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5ldyBOb3RpY2UoYCR7YWN0aW9ufTogJHtwYXJ0cy5qb2luKFwiLCBcIil9LmAsIDEwMDAwKTtcbiAgfVxufSJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFBZTtBQUNmLGdCQUFlO0FBQ2Ysa0JBQWlCO0FBQ2pCLHNCQXFCTztBQTJHUCxJQUFNLG1CQUF1QztBQUFBLEVBQzNDLGtCQUFrQjtBQUFBLEVBQ2xCLG9CQUFvQjtBQUFBLEVBQ3BCLGtCQUFrQjtBQUFBLEVBQ2xCLHVCQUF1QjtBQUFBLEVBQ3ZCLDZCQUE2QjtBQUFBLEVBQzdCLHNCQUFzQjtBQUFBLEVBQ3RCLFNBQVMsQ0FBQztBQUNaO0FBRUEsSUFBTSx5QkFLRDtBQUFBLEVBQ0gsTUFBTTtBQUFBLElBQ0osV0FBVztBQUFBLElBQ1gsYUFBYTtBQUFBLElBQ2Isa0JBQWtCO0FBQUEsSUFDbEIsTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFdBQVc7QUFBQSxJQUNYLGFBQWE7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
