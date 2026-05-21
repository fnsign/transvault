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
      unique.set(entry.path, entry);
    }
    return [...unique.values()].sort((left, right) => left.path.length - right.path.length).filter((entry, index, items) => {
      return !items.some((candidate, candidateIndex) => {
        if (candidateIndex >= index) {
          return false;
        }
        return entry.path.startsWith(`${candidate.path}/`);
      });
    });
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
    const explicitFileMap = /* @__PURE__ */ new Map();
    for (const entry of plan.explicitFiles) {
      explicitFileMap.set(entry.file.path, entry);
    }
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
          const tagResult = this.applyDestinationTags(content, mode, entry.sourceVaultRelativePath, summary);
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
  applyDestinationTags(content, mode, sourcePath, summary) {
    const tags = this.getTagsForMode(mode);
    if (tags.length === 0) {
      return { content };
    }
    const result = this.addTagsToMarkdownContent(content, tags);
    if (result.warning) {
      summary.warnings.push(`Skipped tagging ${sourcePath}: ${result.warning}`);
      return { content };
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
    el.createDiv({ cls: "trans-vault-suggest-title", text: getDestinationDisplayName(target) });
    const detail = [target.vaultPath.trim(), target.destinationPath.trim()].filter((entry) => entry.length > 0).join(" -> ");
    if (detail.length > 0) {
      el.createDiv({ cls: "trans-vault-suggest-detail", text: detail });
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
    this.modalEl.addClass("trans-vault-review-modal");
    this.titleEl.setText("Review linked notes");
    this.contentEl.empty();
    const conflictNotice = this.contentEl.createDiv({ cls: "trans-vault-review-conflict-notice" });
    conflictNotice.createSpan({
      cls: "trans-vault-review-conflict-badge",
      text: `Conflict handling: ${getConflictStrategyLabel(this.conflictStrategy)}`
    });
    conflictNotice.createEl("p", {
      cls: "trans-vault-review-conflict-text",
      text: getConflictStrategyDescription(this.conflictStrategy)
    });
    this.contentEl.createEl("p", {
      text: "Review direct links and backlinks for the selected Markdown notes. The transfer includes every note instance that remains selected."
    });
    const tree = this.contentEl.createDiv({ cls: "trans-vault-review-tree" });
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
    const item = containerEl.createDiv({ cls: "trans-vault-review-node" });
    item.style.setProperty("--trans-vault-depth", String(depth));
    const row = item.createDiv({ cls: "trans-vault-review-row" });
    row.addClass(`trans-vault-review-row-${node.type}`);
    const checkboxShell = row.createSpan({ cls: "trans-vault-checkbox-shell" });
    const checkbox = checkboxShell.createEl("input", { type: "checkbox" });
    this.nodeElements.set(node.id, checkbox);
    checkbox.addEventListener("change", () => {
      this.toggleNode(node, checkbox.checked);
      this.refreshTree();
    });
    const indicator = checkboxShell.createSpan({ cls: "trans-vault-check-indicator" });
    const iconEl = row.createSpan({ cls: "trans-vault-review-icon" });
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
    const label = row.createSpan({ cls: "trans-vault-review-label", text: node.label });
    label.addClass(`trans-vault-review-label-${node.type}`);
    const childrenContainer = item.createDiv({ cls: "trans-vault-review-children" });
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
      const indicator = checkbox.parentElement?.querySelector(".trans-vault-check-indicator") ?? null;
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
    const card = containerEl.createDiv({ cls: "trans-vault-target-card" });
    const validationHost = card.createDiv({ cls: "trans-vault-target-validation" });
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
      container.className = "trans-vault-skip-notice";
      const title = document.createElement("div");
      title.className = "trans-vault-skip-notice-title";
      title.textContent = `${action} with warnings: ${parts.join(", ")}.`;
      container.appendChild(title);
      const shownEntries = summary.skippedEntries.slice(0, 10);
      const list = document.createElement("ul");
      list.className = "trans-vault-skip-notice-list";
      for (const skipped of shownEntries) {
        const row = document.createElement("li");
        row.textContent = skipped;
        list.appendChild(row);
      }
      container.appendChild(list);
      if (summary.skippedEntries.length > shownEntries.length) {
        const more = document.createElement("div");
        more.className = "trans-vault-skip-notice-more";
        more.textContent = `... and ${formatCount(summary.skippedEntries.length - shownEntries.length, "more skipped item", "more skipped items")}.`;
        container.appendChild(more);
      }
      const dismissHint = document.createElement("div");
      dismissHint.className = "trans-vault-skip-notice-dismiss";
      dismissHint.textContent = "Click to dismiss";
      container.appendChild(dismissHint);
      fragment.appendChild(container);
      const notice = new import_obsidian.Notice(fragment, 0);
      notice.noticeEl?.addClass("trans-vault-notice-clickable");
      notice.noticeEl?.addEventListener("click", () => {
        notice.hide?.();
      });
      return;
    }
    new import_obsidian.Notice(`${action}: ${parts.join(", ")}.`, 1e4);
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0IG9zIGZyb20gXCJvc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7XG4gIEFwcCxcbiAgRmlsZVN5c3RlbUFkYXB0ZXIsXG4gIEZ1enp5TWF0Y2gsXG4gIEZ1enp5U3VnZ2VzdE1vZGFsLFxuICBNZW51LFxuICBNZW51SXRlbSxcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGxhdGZvcm0sXG4gIFBsdWdpbixcbiAgUGx1Z2luU2V0dGluZ1RhYixcbiAgU2V0dGluZyxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFRGb2xkZXIsXG4gIGdldExpbmtwYXRoLFxuICBub3JtYWxpemVQYXRoLFxuICBwYXJzZVlhbWwsXG4gIHNldEljb24sXG4gIHN0cmluZ2lmeVlhbWwsXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG50eXBlIFRyYW5zZmVyTW9kZSA9IFwiY29weVwiIHwgXCJtb3ZlXCI7XG50eXBlIENvbmZsaWN0U3RyYXRlZ3kgPSBcInNraXBcIiB8IFwiYXV0by1yZW5hbWVcIiB8IFwib3ZlcndyaXRlXCI7XG50eXBlIFJldmlld0RpcmVjdGlvbiA9IFwidG9cIiB8IFwiZnJvbVwiO1xudHlwZSBSZXZpZXdOb2RlVHlwZSA9IFwibm90ZVwiIHwgXCJncm91cFwiIHwgXCJhdHRhY2htZW50XCI7XG50eXBlIFJldmlld0RpYWxvZ01vZGUgPSBcImFsd2F5c1wiIHwgXCJsaW5rZWQtb25seVwiIHwgXCJuZXZlclwiO1xuXG5pbnRlcmZhY2UgRGVzdGluYXRpb25Db25maWcge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHZhdWx0UGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvblBhdGg6IHN0cmluZztcbiAgdXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbjogYm9vbGVhbjtcbiAgYXR0YWNobWVudFBhdGg6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFRyYW5zVmF1bHRTZXR0aW5ncyB7XG4gIGNvbmZsaWN0U3RyYXRlZ3k6IENvbmZsaWN0U3RyYXRlZ3k7XG4gIGluY2x1ZGVMaW5rZWRGaWxlczogYm9vbGVhbjtcbiAgcmV2aWV3RGlhbG9nTW9kZTogUmV2aWV3RGlhbG9nTW9kZTtcbiAgdGFnc0ZvckNvcGllZEVsZW1lbnRzOiBzdHJpbmc7XG4gIGFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50czogYm9vbGVhbjtcbiAgdGFnc0Zvck1vdmVkRWxlbWVudHM6IHN0cmluZztcbiAgdGFyZ2V0czogRGVzdGluYXRpb25Db25maWdbXTtcbn1cblxuaW50ZXJmYWNlIFJldmlld05vZGUge1xuICBpZDogc3RyaW5nO1xuICB0eXBlOiBSZXZpZXdOb2RlVHlwZTtcbiAgbGFiZWw6IHN0cmluZztcbiAgZmlsZVBhdGg/OiBzdHJpbmc7XG4gIGRpcmVjdGlvbj86IFJldmlld0RpcmVjdGlvbjtcbiAgY2hpbGRyZW46IFJldmlld05vZGVbXTtcbn1cblxuaW50ZXJmYWNlIERpcmVjdERlcGVuZGVuY2llcyB7XG4gIG1hcmtkb3duOiBTZXQ8c3RyaW5nPjtcbiAgYXR0YWNobWVudHM6IFNldDxzdHJpbmc+O1xufVxuXG5pbnRlcmZhY2UgRGlyZWN0UmVsYXRpb25zaGlwcyBleHRlbmRzIERpcmVjdERlcGVuZGVuY2llcyB7XG4gIGJhY2tsaW5rczogU2V0PHN0cmluZz47XG59XG5cbmludGVyZmFjZSBFeHBsaWNpdEZpbGVTZWxlY3Rpb24ge1xuICBmaWxlOiBURmlsZTtcbiAgZGVzdGluYXRpb25SZWxhdGl2ZVBhdGg6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFJlc29sdmVkRGVzdGluYXRpb25Db25maWcgZXh0ZW5kcyBEZXN0aW5hdGlvbkNvbmZpZyB7XG4gIHZhdWx0UGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvblBhdGg6IHN0cmluZztcbiAgZWZmZWN0aXZlQXR0YWNobWVudFBhdGg6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFByZXBhcmVkVHJhbnNmZXJQbGFuIHtcbiAgc291cmNlVmF1bHRSb290OiBzdHJpbmc7XG4gIHRhcmdldDogUmVzb2x2ZWREZXN0aW5hdGlvbkNvbmZpZztcbiAgZXhwbGljaXRGaWxlczogRXhwbGljaXRGaWxlU2VsZWN0aW9uW107XG4gIGV4cGxpY2l0TWFya2Rvd25QYXRoczogc3RyaW5nW107XG4gIHNlbGVjdGVkRm9sZGVyUGF0aHM6IHN0cmluZ1tdO1xuICByZXZpZXdSb290czogUmV2aWV3Tm9kZVtdO1xuICBkaXJlY3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIERpcmVjdERlcGVuZGVuY2llcz47XG4gIGRpcmVjdE1hcmtkb3duUmVsYXRpb25zOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj47XG59XG5cbmludGVyZmFjZSBEcmFmdFRyYW5zZmVyRW50cnkge1xuICBzb3VyY2VGaWxlOiBURmlsZTtcbiAgc291cmNlQWJzb2x1dGVQYXRoOiBzdHJpbmc7XG4gIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIGRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoOiBzdHJpbmc7XG4gIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZztcbiAgc2hvdWxkUmV3cml0ZUxpbmtzOiBib29sZWFuO1xuICBpc0V4cGxpY2l0U2VsZWN0aW9uOiBib29sZWFuO1xuICB3YXNSZW5hbWVkOiBib29sZWFuO1xuICBvdmVyd3JpdGVFeGlzdGluZzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEZpbmFsaXplZFRyYW5zZmVyRW50cnkgZXh0ZW5kcyBEcmFmdFRyYW5zZmVyRW50cnkge31cblxuaW50ZXJmYWNlIFRyYW5zZmVyU3VtbWFyeSB7XG4gIHJlcXVlc3RlZEZpbGVDb3VudDogbnVtYmVyO1xuICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogbnVtYmVyO1xuICBtb3ZlZEZpbGVDb3VudDogbnVtYmVyO1xuICBza2lwcGVkQ29uZmxpY3RDb3VudDogbnVtYmVyO1xuICByZW5hbWVkQ291bnQ6IG51bWJlcjtcbiAgZmFpbGVkQ291bnQ6IG51bWJlcjtcbiAgc2tpcHBlZEVudHJpZXM6IHN0cmluZ1tdO1xuICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBSZXZpZXdNb2RhbFJlc3VsdCB7XG4gIGNvbmZpcm1lZDogYm9vbGVhbjtcbiAgc2VsZWN0ZWRQYXRoczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgd2FybmluZz86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBhcnNlZE1hcmtkb3duSHJlZiB7XG4gIHBhdGg6IHN0cmluZztcbiAgd3JhcHBlZEluQW5nbGVzOiBib29sZWFuO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBUcmFuc1ZhdWx0U2V0dGluZ3MgPSB7XG4gIGNvbmZsaWN0U3RyYXRlZ3k6IFwic2tpcFwiLFxuICBpbmNsdWRlTGlua2VkRmlsZXM6IHRydWUsXG4gIHJldmlld0RpYWxvZ01vZGU6IFwiYWx3YXlzXCIsXG4gIHRhZ3NGb3JDb3BpZWRFbGVtZW50czogXCJcIixcbiAgYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzOiBmYWxzZSxcbiAgdGFnc0Zvck1vdmVkRWxlbWVudHM6IFwiXCIsXG4gIHRhcmdldHM6IFtdLFxufTtcblxuY29uc3QgVFJBTlNGRVJfTU9ERV9NRVRBREFUQTogUmVjb3JkPFRyYW5zZmVyTW9kZSwge1xuICBtZW51VGl0bGU6IHN0cmluZztcbiAgY29tbWFuZE5hbWU6IHN0cmluZztcbiAgdGFyZ2V0TW9kYWxUaXRsZTogc3RyaW5nO1xuICBpY29uOiBzdHJpbmc7XG59PiA9IHtcbiAgY29weToge1xuICAgIG1lbnVUaXRsZTogXCJDb3B5IHRvIHZhdWx0Li4uXCIsXG4gICAgY29tbWFuZE5hbWU6IFwiQ29weSBhY3RpdmUgZmlsZSB0byB2YXVsdC4uLlwiLFxuICAgIHRhcmdldE1vZGFsVGl0bGU6IFwiQ2hvb3NlIGEgdmF1bHQgdG8gY29weSB0b1wiLFxuICAgIGljb246IFwiY29weS1wbHVzXCIsXG4gIH0sXG4gIG1vdmU6IHtcbiAgICBtZW51VGl0bGU6IFwiTW92ZSB0byB2YXVsdC4uLlwiLFxuICAgIGNvbW1hbmROYW1lOiBcIk1vdmUgYWN0aXZlIGZpbGUgdG8gdmF1bHQuLi5cIixcbiAgICB0YXJnZXRNb2RhbFRpdGxlOiBcIkNob29zZSBhIHZhdWx0IHRvIG1vdmUgdG9cIixcbiAgICBpY29uOiBcImZvbGRlci1zeW1saW5rXCIsXG4gIH0sXG59O1xuXG5jb25zdCBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQTogUmVjb3JkPENvbmZsaWN0U3RyYXRlZ3ksIHtcbiAgbGFiZWw6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbn0+ID0ge1xuICBza2lwOiB7XG4gICAgbGFiZWw6IFwiU2tpcFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIHdpbGwgYmUgc2tpcHBlZCBkdXJpbmcgdHJhbnNmZXIuXCIsXG4gIH0sXG4gIFwiYXV0by1yZW5hbWVcIjoge1xuICAgIGxhYmVsOiBcIkF1dG8tcmVuYW1lXCIsXG4gICAgZGVzY3JpcHRpb246IFwiRXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgd2lsbCBiZSBrZXB0LCBhbmQgbmV3IGNvcGllcyB3aWxsIGJlIHJlbmFtZWQgYXV0b21hdGljYWxseS5cIixcbiAgfSxcbiAgb3ZlcndyaXRlOiB7XG4gICAgbGFiZWw6IFwiT3ZlcndyaXRlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiRXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdHJhbnNmZXIuXCIsXG4gIH0sXG59O1xuXG5mdW5jdGlvbiBjcmVhdGVEZXN0aW5hdGlvbklkKCk6IHN0cmluZyB7XG4gIHJldHVybiBgZGVzdGluYXRpb24tJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDgpfWA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJsYW5rRGVzdGluYXRpb24oKTogRGVzdGluYXRpb25Db25maWcge1xuICByZXR1cm4ge1xuICAgIGlkOiBjcmVhdGVEZXN0aW5hdGlvbklkKCksXG4gICAgbmFtZTogXCJcIixcbiAgICB2YXVsdFBhdGg6IFwiXCIsXG4gICAgZGVzdGluYXRpb25QYXRoOiBcIlwiLFxuICAgIHVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb246IHRydWUsXG4gICAgYXR0YWNobWVudFBhdGg6IFwiXCIsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWROYW1lID0gdGFyZ2V0Lm5hbWUudHJpbSgpO1xuICBpZiAodHJpbW1lZE5hbWUubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiB0cmltbWVkTmFtZTtcbiAgfVxuICBjb25zdCB0cmltbWVkVmF1bHRQYXRoID0gdGFyZ2V0LnZhdWx0UGF0aC50cmltKCk7XG4gIGlmICh0cmltbWVkVmF1bHRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBcIlVubmFtZWQgZGVzdGluYXRpb25cIjtcbiAgfVxuICBjb25zdCBwYXJ0cyA9IHRyaW1tZWRWYXVsdFBhdGguc3BsaXQoL1svXFxcXF0rLykuZmlsdGVyKEJvb2xlYW4pO1xuICByZXR1cm4gcGFydHMuYXQoLTEpID8/IHRyaW1tZWRWYXVsdFBhdGg7XG59XG5cbmZ1bmN0aW9uIGdldENvbmZsaWN0U3RyYXRlZ3lMYWJlbChzdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSk6IHN0cmluZyB7XG4gIHJldHVybiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtzdHJhdGVneV0ubGFiZWw7XG59XG5cbmZ1bmN0aW9uIGdldENvbmZsaWN0U3RyYXRlZ3lEZXNjcmlwdGlvbihzdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSk6IHN0cmluZyB7XG4gIHJldHVybiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtzdHJhdGVneV0uZGVzY3JpcHRpb247XG59XG5cbmZ1bmN0aW9uIGZvcm1hdENvdW50KGNvdW50OiBudW1iZXIsIHNpbmd1bGFyOiBzdHJpbmcsIHBsdXJhbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2NvdW50fSAke2NvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWx9YDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5ub3JtYWxpemUocGF0aC5yZXNvbHZlKHZhbHVlKSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpO1xuICBpZiAoXG4gICAgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aCgnXCInKSAmJiBub3JtYWxpemVkLmVuZHNXaXRoKCdcIicpKVxuICAgIHx8IChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vcm1hbGl6ZWQuZW5kc1dpdGgoXCInXCIpKVxuICApIHtcbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5zbGljZSgxLCAtMSkudHJpbSgpO1xuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcIndpbjMyXCIpIHtcbiAgICBpZiAobm9ybWFsaXplZCA9PT0gXCJ+XCIpIHtcbiAgICAgIG5vcm1hbGl6ZWQgPSBvcy5ob21lZGlyKCk7XG4gICAgfSBlbHNlIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCJ+L1wiKSkge1xuICAgICAgbm9ybWFsaXplZCA9IHBhdGguam9pbihvcy5ob21lZGlyKCksIG5vcm1hbGl6ZWQuc2xpY2UoMikpO1xuICAgIH0gZWxzZSBpZiAobm9ybWFsaXplZC5zdGFydHNXaXRoKFwiJEhPTUUvXCIpKSB7XG4gICAgICBub3JtYWxpemVkID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgbm9ybWFsaXplZC5zbGljZShcIiRIT01FL1wiLmxlbmd0aCkpO1xuICAgIH1cbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5yZXBsYWNlKC9cXFxcKFsgISMkJicoKSo7PD4/QFtcXF1eYHt8fX5dKS9nLCBcIiQxXCIpO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVBYnNvbHV0ZVBhdGgodmFsdWU6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWQgPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHZhbHVlKTtcbiAgaWYgKHRyaW1tZWQubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBpcyByZXF1aXJlZC5gKTtcbiAgfVxuICBpZiAoIXBhdGguaXNBYnNvbHV0ZSh0cmltbWVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbXVzdCBiZSBhbiBhYnNvbHV0ZSBwYXRoLmApO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVBYnNvbHV0ZVBhdGgodHJpbW1lZCk7XG59XG5cbmZ1bmN0aW9uIHRvVmF1bHRSZWxhdGl2ZVBhdGgodmF1bHRSb290OiBzdHJpbmcsIGFic29sdXRlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5vcm1hbGl6ZVBhdGgocGF0aC5yZWxhdGl2ZSh2YXVsdFJvb3QsIGFic29sdXRlUGF0aCkuc3BsaXQocGF0aC5zZXApLmpvaW4oXCIvXCIpKTtcbn1cblxuZnVuY3Rpb24gY2xlYW5UYWdJbnB1dCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoXCIsXCIpXG4gICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAuZmlsdGVyKChlbnRyeSwgaW5kZXgsIGl0ZW1zKSA9PiBlbnRyeS5sZW5ndGggPiAwICYmIGl0ZW1zLmluZGV4T2YoZW50cnkpID09PSBpbmRleCk7XG59XG5cbmZ1bmN0aW9uIGpvaW5UYWdWYWx1ZXMoZXhpc3Rpbmc6IHN0cmluZ1tdLCBhZGRpdGlvbnM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICBjb25zdCBub3JtYWxpemVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgdGFnIG9mIFsuLi5leGlzdGluZywgLi4uYWRkaXRpb25zXSkge1xuICAgIGNvbnN0IGNsZWFuID0gdGFnLnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKTtcbiAgICBpZiAoY2xlYW4ubGVuZ3RoID4gMCkge1xuICAgICAgbm9ybWFsaXplZC5hZGQoY2xlYW4pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gWy4uLm5vcm1hbGl6ZWRdO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0RnJvbnRtYXR0ZXJSYW5nZShjb250ZW50OiBzdHJpbmcpOiB7IHJhbmdlOiBbbnVtYmVyLCBudW1iZXJdOyBib2R5OiBzdHJpbmcgfSB8IG51bGwgfCBcImludmFsaWRcIiB7XG4gIGlmICghY29udGVudC5zdGFydHNXaXRoKFwiLS0tXFxuXCIpICYmICFjb250ZW50LnN0YXJ0c1dpdGgoXCItLS1cXHJcXG5cIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBtYXRjaGVyID0gL14tLS1cXHI/XFxuKFtcXHNcXFNdKj8pXFxyP1xcbi0tLVxccj9cXG4/LztcbiAgY29uc3QgbWF0Y2ggPSBjb250ZW50Lm1hdGNoKG1hdGNoZXIpO1xuICBpZiAoIW1hdGNoIHx8IG1hdGNoLmluZGV4ICE9PSAwKSB7XG4gICAgcmV0dXJuIFwiaW52YWxpZFwiO1xuICB9XG4gIHJldHVybiB7XG4gICAgcmFuZ2U6IFswLCBtYXRjaFswXS5sZW5ndGhdLFxuICAgIGJvZHk6IG1hdGNoWzFdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJCb2R5OiBzdHJpbmcpOiBcImFycmF5XCIgfCBcImNvbW1hXCIgfCBcInNwYWNlXCIgfCBcInN0cmluZ1wiIHwgXCJ1bmtub3duXCIge1xuICBjb25zdCB0YWdzTGluZSA9IGZyb250bWF0dGVyQm9keS5tYXRjaCgvXnRhZ3M6XFxzKiguKykkL20pO1xuICBpZiAoIXRhZ3NMaW5lKSB7XG4gICAgaWYgKC9edGFnczpcXHMqJC9tLnRlc3QoZnJvbnRtYXR0ZXJCb2R5KSB8fCAvXnRhZ3M6XFxzKlxccj9cXG4vbS50ZXN0KGZyb250bWF0dGVyQm9keSkpIHtcbiAgICAgIHJldHVybiBcImFycmF5XCI7XG4gICAgfVxuICAgIHJldHVybiBcInVua25vd25cIjtcbiAgfVxuICBjb25zdCB2YWx1ZSA9IHRhZ3NMaW5lWzFdLnRyaW0oKTtcbiAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoXCJbXCIpKSB7XG4gICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgfVxuICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpKSB7XG4gICAgcmV0dXJuIFwiY29tbWFcIjtcbiAgfVxuICBpZiAoL1xccy8udGVzdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gXCJzcGFjZVwiO1xuICB9XG4gIHJldHVybiBcInN0cmluZ1wiO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0RXhpc3RpbmdUYWdzKHZhbHVlOiB1bmtub3duKTogc3RyaW5nW10ge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgIC5tYXAoKGVudHJ5KSA9PiAodHlwZW9mIGVudHJ5ID09PSBcInN0cmluZ1wiID8gZW50cnkgOiBTdHJpbmcoZW50cnkgPz8gXCJcIikpKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3Qgc2VwYXJhdG9yID0gdmFsdWUuaW5jbHVkZXMoXCIsXCIpID8gXCIsXCIgOiAvXFxzKy87XG4gICAgcmV0dXJuIHZhbHVlXG4gICAgICAuc3BsaXQoc2VwYXJhdG9yKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKTtcbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIGlzTWFya2Rvd25GaWxlKGZpbGU6IFRGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpID09PSBcIm1kXCI7XG59XG5cbmNsYXNzIERlc3RpbmF0aW9uUmVzb2x2ZXIge1xuICBhc3luYyByZXNvbHZlKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPFJlc29sdmVkRGVzdGluYXRpb25Db25maWc+IHtcbiAgICBjb25zdCB2YXVsdFBhdGggPSBlbnN1cmVBYnNvbHV0ZVBhdGgodGFyZ2V0LnZhdWx0UGF0aCwgXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uUGF0aCA9IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQuZGVzdGluYXRpb25QYXRoLCBcIkRlc3RpbmF0aW9uIHBhdGhcIik7XG4gICAgY29uc3QgZWZmZWN0aXZlQXR0YWNobWVudFBhdGggPSB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvblxuICAgICAgPyBhd2FpdCB0aGlzLnJlc29sdmVEZWZhdWx0QXR0YWNobWVudFBhdGgodmF1bHRQYXRoKVxuICAgICAgOiBlbnN1cmVBYnNvbHV0ZVBhdGgodGFyZ2V0LmF0dGFjaG1lbnRQYXRoLCBcIkF0dGFjaG1lbnQgcGF0aFwiKTtcblxuICAgIGF3YWl0IHRoaXMuYXNzZXJ0RGlyZWN0b3J5RXhpc3RzKHZhdWx0UGF0aCwgXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIpO1xuICAgIHRoaXMuYXNzZXJ0SW5zaWRlVmF1bHQodmF1bHRQYXRoLCBkZXN0aW5hdGlvblBhdGgsIFwiRGVzdGluYXRpb24gcGF0aFwiKTtcbiAgICB0aGlzLmFzc2VydEluc2lkZVZhdWx0KHZhdWx0UGF0aCwgZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsIFwiQXR0YWNobWVudCBwYXRoXCIpO1xuICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RpbmF0aW9uUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgZnMubWtkaXIoZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnRhcmdldCxcbiAgICAgIHZhdWx0UGF0aCxcbiAgICAgIGRlc3RpbmF0aW9uUGF0aCxcbiAgICAgIGVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoLFxuICAgICAgYXR0YWNobWVudFBhdGg6IHRhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCksXG4gICAgfTtcbiAgfVxuXG4gIHZhbGlkYXRlKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRyaW1tZWRWYXVsdFBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC52YXVsdFBhdGgpO1xuICAgIGNvbnN0IHRyaW1tZWREZXN0aW5hdGlvblBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC5kZXN0aW5hdGlvblBhdGgpO1xuICAgIGNvbnN0IHRyaW1tZWRBdHRhY2htZW50UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LmF0dGFjaG1lbnRQYXRoKTtcblxuICAgIGlmICh0cmltbWVkVmF1bHRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoIGlzIHJlcXVpcmVkLlwiKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZFZhdWx0UGF0aCkpIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gdmF1bHQgcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICB9XG5cbiAgICBpZiAodHJpbW1lZERlc3RpbmF0aW9uUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gcGF0aCBpcyByZXF1aXJlZC5cIik7XG4gICAgfSBlbHNlIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWREZXN0aW5hdGlvblBhdGgpKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHBhdGggbXVzdCBiZSBhYnNvbHV0ZS5cIik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmlzQWJzb2x1dGUodHJpbW1lZFZhdWx0UGF0aCkgJiYgIXRoaXMuaXNJbnNpZGVWYXVsdCh0cmltbWVkVmF1bHRQYXRoLCB0cmltbWVkRGVzdGluYXRpb25QYXRoKSkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiBwYXRoIG11c3QgYmUgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdC5cIik7XG4gICAgfVxuXG4gICAgaWYgKCF0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgaWYgKHRyaW1tZWRBdHRhY2htZW50UGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggaXMgcmVxdWlyZWQgd2hlbiBhdXRvbWF0aWMgYXR0YWNobWVudCBkZXRlY3Rpb24gaXMgZGlzYWJsZWQuXCIpO1xuICAgICAgfSBlbHNlIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWRBdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggbXVzdCBiZSBhYnNvbHV0ZS5cIik7XG4gICAgICB9IGVsc2UgaWYgKHBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSAmJiAhdGhpcy5pc0luc2lkZVZhdWx0KHRyaW1tZWRWYXVsdFBhdGgsIHRyaW1tZWRBdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggbXVzdCBiZSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JzO1xuICB9XG5cbiAgYXN5bmMgcmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aCh2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aCh2YXVsdFBhdGgpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwYXRoLmpvaW4obm9ybWFsaXplZFZhdWx0UGF0aCwgXCIub2JzaWRpYW5cIiwgXCJhcHAuanNvblwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmF3ID0gYXdhaXQgZnMucmVhZEZpbGUoY29uZmlnUGF0aCwgXCJ1dGY4XCIpO1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIHsgYXR0YWNobWVudEZvbGRlclBhdGg/OiBzdHJpbmcgfTtcbiAgICAgIGNvbnN0IGF0dGFjaG1lbnRGb2xkZXJQYXRoID0gcGFyc2VkLmF0dGFjaG1lbnRGb2xkZXJQYXRoPy50cmltKCk7XG4gICAgICBpZiAoIWF0dGFjaG1lbnRGb2xkZXJQYXRoKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVkVmF1bHRQYXRoO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzb2x2ZWQgPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgocGF0aC5yZXNvbHZlKG5vcm1hbGl6ZWRWYXVsdFBhdGgsIGF0dGFjaG1lbnRGb2xkZXJQYXRoKSk7XG4gICAgICBpZiAoIXRoaXMuaXNJbnNpZGVWYXVsdChub3JtYWxpemVkVmF1bHRQYXRoLCByZXNvbHZlZCkpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRWYXVsdFBhdGg7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gbm9ybWFsaXplZFZhdWx0UGF0aDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGFzc2VydERpcmVjdG9yeUV4aXN0cyhkaXJlY3RvcnlQYXRoOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdCA9IGF3YWl0IGZzLnN0YXQoZGlyZWN0b3J5UGF0aCk7XG4gICAgICBpZiAoIXN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IG11c3QgcG9pbnQgdG8gYSBkaXJlY3RvcnkuYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09IFwiRU5PRU5UXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICAgIH1cbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0SW5zaWRlVmF1bHQodmF1bHRQYXRoOiBzdHJpbmcsIGNhbmRpZGF0ZVBhdGg6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc0luc2lkZVZhdWx0KHZhdWx0UGF0aCwgY2FuZGlkYXRlUGF0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbXVzdCBiZSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaXNJbnNpZGVWYXVsdCh2YXVsdFBhdGg6IHN0cmluZywgY2FuZGlkYXRlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKG5vcm1hbGl6ZUFic29sdXRlUGF0aCh2YXVsdFBhdGgpLCBub3JtYWxpemVBYnNvbHV0ZVBhdGgoY2FuZGlkYXRlUGF0aCkpO1xuICAgIHJldHVybiAhKHJlbGF0aXZlLnN0YXJ0c1dpdGgoXCIuLlwiKSB8fCBwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmUpKTtcbiAgfVxufVxuXG5jbGFzcyBUcmFuc2ZlclBsYW5uZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogVHJhbnNWYXVsdFBsdWdpbiwgcHJpdmF0ZSByZWFkb25seSBkZXN0aW5hdGlvblJlc29sdmVyOiBEZXN0aW5hdGlvblJlc29sdmVyKSB7fVxuXG4gIGFzeW5jIHByZXBhcmUoc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10sIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPFByZXBhcmVkVHJhbnNmZXJQbGFuPiB7XG4gICAgY29uc3Qgc291cmNlVmF1bHRSb290ID0gdGhpcy5nZXRTb3VyY2VWYXVsdFJvb3QoKTtcbiAgICBjb25zdCByZXNvbHZlZFRhcmdldCA9IGF3YWl0IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci5yZXNvbHZlKHRhcmdldCk7XG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbGVjdGlvbiA9IHRoaXMubm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbik7XG4gICAgY29uc3QgZXhwbGljaXRGaWxlcyA9IHRoaXMuY29sbGVjdEV4cGxpY2l0RmlsZXMobm9ybWFsaXplZFNlbGVjdGlvbik7XG5cbiAgICBpZiAoZXhwbGljaXRGaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBzZWxlY3Rpb24gZG9lcyBub3QgY29udGFpbiBhbnkgZmlsZXMgdG8gdHJhbnNmZXIuXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cGxpY2l0TWFya2Rvd25GaWxlcyA9IGV4cGxpY2l0RmlsZXMubWFwKChlbnRyeSkgPT4gZW50cnkuZmlsZSkuZmlsdGVyKGlzTWFya2Rvd25GaWxlKTtcbiAgICBjb25zdCByZXZpZXdSb290czogUmV2aWV3Tm9kZVtdID0gW107XG4gICAgY29uc3QgZGlyZWN0RGVwZW5kZW5jaWVzID0gbmV3IE1hcDxzdHJpbmcsIERpcmVjdERlcGVuZGVuY2llcz4oKTtcbiAgICBjb25zdCBkaXJlY3RNYXJrZG93blJlbGF0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgICBjb25zdCByZWxhdGlvbnNoaXBzQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgRGlyZWN0UmVsYXRpb25zaGlwcz4oKTtcblxuICAgIGNvbnN0IGdldFJlbGF0aW9uc2hpcHMgPSAoZmlsZTogVEZpbGUpOiBEaXJlY3RSZWxhdGlvbnNoaXBzID0+IHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHJlbGF0aW9uc2hpcHNDYWNoZS5nZXQoZmlsZS5wYXRoKTtcbiAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSB0aGlzLmNvbGxlY3REaXJlY3RSZWxhdGlvbnNoaXBzKGZpbGUpO1xuICAgICAgcmVsYXRpb25zaGlwc0NhY2hlLnNldChmaWxlLnBhdGgsIHJlbGF0aW9uc2hpcHMpO1xuICAgICAgZGlyZWN0RGVwZW5kZW5jaWVzLnNldChmaWxlLnBhdGgsIHtcbiAgICAgICAgbWFya2Rvd246IHJlbGF0aW9uc2hpcHMubWFya2Rvd24sXG4gICAgICAgIGF0dGFjaG1lbnRzOiByZWxhdGlvbnNoaXBzLmF0dGFjaG1lbnRzLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVsYXRpb25zaGlwcztcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGV4cGxpY2l0TWFya2Rvd25GaWxlcykge1xuICAgICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IGdldFJlbGF0aW9uc2hpcHMoZmlsZSk7XG4gICAgICBkaXJlY3RNYXJrZG93blJlbGF0aW9ucy5zZXQoZmlsZS5wYXRoLCBuZXcgU2V0PHN0cmluZz4oW1xuICAgICAgICAuLi5yZWxhdGlvbnNoaXBzLm1hcmtkb3duLFxuICAgICAgICAuLi5yZWxhdGlvbnNoaXBzLmJhY2tsaW5rcyxcbiAgICAgIF0pKTtcblxuICAgICAgY29uc3QgZ3JvdXBzOiBSZXZpZXdOb2RlW10gPSB0aGlzLmNyZWF0ZUF0dGFjaG1lbnRHcm91cChmaWxlLnBhdGgsIGZpbGUucGF0aCwgZ2V0UmVsYXRpb25zaGlwcyk7XG4gICAgICBpZiAocmVsYXRpb25zaGlwcy5tYXJrZG93bi5zaXplID4gMCkge1xuICAgICAgICBncm91cHMucHVzaCh7XG4gICAgICAgICAgaWQ6IGAke2ZpbGUucGF0aH06OnRvLWdyb3VwYCxcbiAgICAgICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICAgICAgbGFiZWw6IFwibGlua3MgdG9cIixcbiAgICAgICAgICBkaXJlY3Rpb246IFwidG9cIixcbiAgICAgICAgICBjaGlsZHJlbjogWy4uLnJlbGF0aW9uc2hpcHMubWFya2Rvd25dXG4gICAgICAgICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpXG4gICAgICAgICAgICAubWFwKChub3RlUGF0aCkgPT4gdGhpcy5jcmVhdGVOb3RlTm9kZShmaWxlLnBhdGgsIFwidG9cIiwgbm90ZVBhdGgsIGdldFJlbGF0aW9uc2hpcHMpKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAocmVsYXRpb25zaGlwcy5iYWNrbGlua3Muc2l6ZSA+IDApIHtcbiAgICAgICAgZ3JvdXBzLnB1c2goe1xuICAgICAgICAgIGlkOiBgJHtmaWxlLnBhdGh9Ojpmcm9tLWdyb3VwYCxcbiAgICAgICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICAgICAgbGFiZWw6IFwibGlua3MgZnJvbVwiLFxuICAgICAgICAgIGRpcmVjdGlvbjogXCJmcm9tXCIsXG4gICAgICAgICAgY2hpbGRyZW46IFsuLi5yZWxhdGlvbnNoaXBzLmJhY2tsaW5rc11cbiAgICAgICAgICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gbGVmdC5sb2NhbGVDb21wYXJlKHJpZ2h0KSlcbiAgICAgICAgICAgIC5tYXAoKG5vdGVQYXRoKSA9PiB0aGlzLmNyZWF0ZU5vdGVOb2RlKGZpbGUucGF0aCwgXCJmcm9tXCIsIG5vdGVQYXRoLCBnZXRSZWxhdGlvbnNoaXBzKSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV2aWV3Um9vdHMucHVzaCh7XG4gICAgICAgIGlkOiBgJHtmaWxlLnBhdGh9Ojpyb290YCxcbiAgICAgICAgdHlwZTogXCJub3RlXCIsXG4gICAgICAgIGxhYmVsOiBmaWxlLmJhc2VuYW1lLFxuICAgICAgICBmaWxlUGF0aDogZmlsZS5wYXRoLFxuICAgICAgICBjaGlsZHJlbjogZ3JvdXBzLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZVZhdWx0Um9vdCxcbiAgICAgIHRhcmdldDogcmVzb2x2ZWRUYXJnZXQsXG4gICAgICBleHBsaWNpdEZpbGVzLFxuICAgICAgZXhwbGljaXRNYXJrZG93blBhdGhzOiBleHBsaWNpdE1hcmtkb3duRmlsZXMubWFwKChmaWxlKSA9PiBmaWxlLnBhdGgpLFxuICAgICAgc2VsZWN0ZWRGb2xkZXJQYXRoczogbm9ybWFsaXplZFNlbGVjdGlvbi5maWx0ZXIoKGVudHJ5KTogZW50cnkgaXMgVEZvbGRlciA9PiBlbnRyeSBpbnN0YW5jZW9mIFRGb2xkZXIpLm1hcCgoZm9sZGVyKSA9PiBmb2xkZXIucGF0aCksXG4gICAgICByZXZpZXdSb290cyxcbiAgICAgIGRpcmVjdERlcGVuZGVuY2llcyxcbiAgICAgIGRpcmVjdE1hcmtkb3duUmVsYXRpb25zLFxuICAgIH07XG4gIH1cblxuICBub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiBUQWJzdHJhY3RGaWxlW10ge1xuICAgIGNvbnN0IHVuaXF1ZSA9IG5ldyBNYXA8c3RyaW5nLCBUQWJzdHJhY3RGaWxlPigpO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2Ygc2VsZWN0aW9uKSB7XG4gICAgICB1bmlxdWUuc2V0KGVudHJ5LnBhdGgsIGVudHJ5KTtcbiAgICB9XG4gICAgcmV0dXJuIFsuLi51bmlxdWUudmFsdWVzKCldXG4gICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQucGF0aC5sZW5ndGggLSByaWdodC5wYXRoLmxlbmd0aClcbiAgICAgIC5maWx0ZXIoKGVudHJ5LCBpbmRleCwgaXRlbXMpID0+IHtcbiAgICAgICAgcmV0dXJuICFpdGVtcy5zb21lKChjYW5kaWRhdGUsIGNhbmRpZGF0ZUluZGV4KSA9PiB7XG4gICAgICAgICAgaWYgKGNhbmRpZGF0ZUluZGV4ID49IGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBlbnRyeS5wYXRoLnN0YXJ0c1dpdGgoYCR7Y2FuZGlkYXRlLnBhdGh9L2ApO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTb3VyY2VWYXVsdFJvb3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCEoYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHJhbnMgVmF1bHQgcmVxdWlyZXMgYSBkZXNrdG9wIGZpbGUgc3lzdGVtIGFkYXB0ZXIuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbm9ybWFsaXplQWJzb2x1dGVQYXRoKGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKSk7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RFeHBsaWNpdEZpbGVzKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10ge1xuICAgIGNvbnN0IGV4cGxpY2l0RmlsZXM6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdID0gW107XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBzZWxlY3Rpb24pIHtcbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGV4cGxpY2l0RmlsZXMucHVzaCh7XG4gICAgICAgICAgZmlsZTogZW50cnksXG4gICAgICAgICAgZGVzdGluYXRpb25SZWxhdGl2ZVBhdGg6IHBhdGgucG9zaXguYmFzZW5hbWUobm9ybWFsaXplUGF0aChlbnRyeS5wYXRoKSksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0Rm9sZGVyRmlsZXMoZW50cnksIGVudHJ5LCBleHBsaWNpdEZpbGVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGV4cGxpY2l0RmlsZXM7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RGb2xkZXJGaWxlcyhmb2xkZXI6IFRGb2xkZXIsIHJvb3RGb2xkZXI6IFRGb2xkZXIsIHNpbms6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlSW5zaWRlUm9vdCA9IHBhdGgucG9zaXgucmVsYXRpdmUobm9ybWFsaXplUGF0aChyb290Rm9sZGVyLnBhdGgpLCBub3JtYWxpemVQYXRoKGNoaWxkLnBhdGgpKTtcbiAgICAgICAgc2luay5wdXNoKHtcbiAgICAgICAgICBmaWxlOiBjaGlsZCxcbiAgICAgICAgICBkZXN0aW5hdGlvblJlbGF0aXZlUGF0aDogbm9ybWFsaXplUGF0aChwYXRoLnBvc2l4LmpvaW4ocm9vdEZvbGRlci5uYW1lLCByZWxhdGl2ZUluc2lkZVJvb3QpKSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGNoaWxkIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICB0aGlzLmNvbGxlY3RGb2xkZXJGaWxlcyhjaGlsZCwgcm9vdEZvbGRlciwgc2luayk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVOb3RlTm9kZShcbiAgICByb290UGF0aDogc3RyaW5nLFxuICAgIGRpcmVjdGlvbjogUmV2aWV3RGlyZWN0aW9uLFxuICAgIG5vdGVQYXRoOiBzdHJpbmcsXG4gICAgZ2V0UmVsYXRpb25zaGlwczogKGZpbGU6IFRGaWxlKSA9PiBEaXJlY3RSZWxhdGlvbnNoaXBzLFxuICApOiBSZXZpZXdOb2RlIHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobm90ZVBhdGgpO1xuICAgIGNvbnN0IGNoaWxkcmVuID0gZmlsZSAmJiBpc01hcmtkb3duRmlsZShmaWxlKVxuICAgICAgPyB0aGlzLmNyZWF0ZUF0dGFjaG1lbnRHcm91cChgJHtyb290UGF0aH06OiR7ZGlyZWN0aW9ufTo6JHtub3RlUGF0aH1gLCBmaWxlLnBhdGgsIGdldFJlbGF0aW9uc2hpcHMpXG4gICAgICA6IFtdO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogYCR7cm9vdFBhdGh9Ojoke2RpcmVjdGlvbn06OiR7bm90ZVBhdGh9YCxcbiAgICAgIHR5cGU6IFwibm90ZVwiLFxuICAgICAgbGFiZWw6IGZpbGU/LmJhc2VuYW1lID8/IHBhdGgucG9zaXguYmFzZW5hbWUobm90ZVBhdGgsIFwiLm1kXCIpLFxuICAgICAgZmlsZVBhdGg6IG5vdGVQYXRoLFxuICAgICAgY2hpbGRyZW4sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXR0YWNobWVudEdyb3VwKFxuICAgIGJyYW5jaElkOiBzdHJpbmcsXG4gICAgbm90ZVBhdGg6IHN0cmluZyxcbiAgICBnZXRSZWxhdGlvbnNoaXBzOiAoZmlsZTogVEZpbGUpID0+IERpcmVjdFJlbGF0aW9uc2hpcHMsXG4gICk6IFJldmlld05vZGVbXSB7XG4gICAgY29uc3Qgbm90ZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChub3RlUGF0aCk7XG4gICAgaWYgKCFub3RlRmlsZSB8fCAhaXNNYXJrZG93bkZpbGUobm90ZUZpbGUpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBnZXRSZWxhdGlvbnNoaXBzKG5vdGVGaWxlKTtcbiAgICBpZiAocmVsYXRpb25zaGlwcy5hdHRhY2htZW50cy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBbe1xuICAgICAgaWQ6IGAke2JyYW5jaElkfTo6YXR0YWNobWVudHMtZ3JvdXBgLFxuICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgbGFiZWw6IFwiYXR0YWNobWVudHNcIixcbiAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5hdHRhY2htZW50c11cbiAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAubWFwKChhdHRhY2htZW50UGF0aCkgPT4gdGhpcy5jcmVhdGVBdHRhY2htZW50Tm9kZShicmFuY2hJZCwgYXR0YWNobWVudFBhdGgpKSxcbiAgICB9XTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXR0YWNobWVudE5vZGUoYnJhbmNoSWQ6IHN0cmluZywgYXR0YWNobWVudFBhdGg6IHN0cmluZyk6IFJldmlld05vZGUge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChhdHRhY2htZW50UGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBgJHticmFuY2hJZH06OmF0dGFjaG1lbnQ6OiR7YXR0YWNobWVudFBhdGh9YCxcbiAgICAgIHR5cGU6IFwiYXR0YWNobWVudFwiLFxuICAgICAgbGFiZWw6IGZpbGU/Lm5hbWUgPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShhdHRhY2htZW50UGF0aCksXG4gICAgICBmaWxlUGF0aDogYXR0YWNobWVudFBhdGgsXG4gICAgICBjaGlsZHJlbjogW10sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdERpcmVjdFJlbGF0aW9uc2hpcHMoZmlsZTogVEZpbGUpOiBEaXJlY3RSZWxhdGlvbnNoaXBzIHtcbiAgICBjb25zdCBtYXJrZG93biA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGF0dGFjaG1lbnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgZm9yIChjb25zdCByZWYgb2YgWy4uLihjYWNoZT8ubGlua3MgPz8gW10pLCAuLi4oY2FjaGU/LmVtYmVkcyA/PyBbXSksIC4uLihjYWNoZT8uZnJvbnRtYXR0ZXJMaW5rcyA/PyBbXSldKSB7XG4gICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGdldExpbmtwYXRoKHJlZi5saW5rKSwgZmlsZS5wYXRoKTtcbiAgICAgIGlmICghKGRlc3RpbmF0aW9uIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGlzTWFya2Rvd25GaWxlKGRlc3RpbmF0aW9uKSkge1xuICAgICAgICBtYXJrZG93bi5hZGQoZGVzdGluYXRpb24ucGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRhY2htZW50cy5hZGQoZGVzdGluYXRpb24ucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYmFja2xpbmtzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcmVzb2x2ZWRMaW5rcyA9ICh0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZSBhcyB1bmtub3duIGFzIHtcbiAgICAgIHJlc29sdmVkTGlua3M/OiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PjtcbiAgICB9KS5yZXNvbHZlZExpbmtzID8/IHt9O1xuICAgIGZvciAoY29uc3QgW3NvdXJjZVBhdGgsIHRhcmdldHNdIG9mIE9iamVjdC5lbnRyaWVzKHJlc29sdmVkTGlua3MpKSB7XG4gICAgICBpZiAoIXRhcmdldHNbZmlsZS5wYXRoXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChzb3VyY2VQYXRoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlICYmIGlzTWFya2Rvd25GaWxlKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGJhY2tsaW5rcy5hZGQoc291cmNlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1hcmtkb3duLFxuICAgICAgYmFja2xpbmtzLFxuICAgICAgYXR0YWNobWVudHMsXG4gICAgfTtcbiAgfVxufVxuXG5jbGFzcyBUcmFuc2ZlckV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4pIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbiwgbW9kZTogVHJhbnNmZXJNb2RlLCBjb25maXJtZWRTZWxlY3Rpb25QYXRocz86IHN0cmluZ1tdKTogUHJvbWlzZTxUcmFuc2ZlclN1bW1hcnk+IHtcbiAgICBjb25zdCBleHBsaWNpdEZpbGVNYXAgPSBuZXcgTWFwPHN0cmluZywgRXhwbGljaXRGaWxlU2VsZWN0aW9uPigpO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGxhbi5leHBsaWNpdEZpbGVzKSB7XG4gICAgICBleHBsaWNpdEZpbGVNYXAuc2V0KGVudHJ5LmZpbGUucGF0aCwgZW50cnkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdGVkUmV2aWV3UGF0aHMgPSBjb25maXJtZWRTZWxlY3Rpb25QYXRoc1xuICAgICAgPyBuZXcgU2V0PHN0cmluZz4oY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBzZWxlY3RlZE1hcmtkb3duUGF0aHMgPSBzZWxlY3RlZFJldmlld1BhdGhzXG4gICAgICA/IG5ldyBTZXQ8c3RyaW5nPihbLi4uc2VsZWN0ZWRSZXZpZXdQYXRoc10uZmlsdGVyKChlbnRyeSkgPT4gdGhpcy5pc1NlbGVjdGVkTWFya2Rvd25QYXRoKGVudHJ5KSkpXG4gICAgICA6IG5ldyBTZXQ8c3RyaW5nPihwbGFuLmV4cGxpY2l0TWFya2Rvd25QYXRocyk7XG5cbiAgICBjb25zdCBkcmFmdEVudHJpZXMgPSBuZXcgTWFwPHN0cmluZywgRHJhZnRUcmFuc2ZlckVudHJ5PigpO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwbGFuLmV4cGxpY2l0RmlsZXMpIHtcbiAgICAgIGlmIChpc01hcmtkb3duRmlsZShlbnRyeS5maWxlKSAmJiAhc2VsZWN0ZWRNYXJrZG93blBhdGhzLmhhcyhlbnRyeS5maWxlLnBhdGgpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZHJhZnRFbnRyaWVzLnNldChcbiAgICAgICAgZW50cnkuZmlsZS5wYXRoLFxuICAgICAgICB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgZW50cnkuZmlsZSwgdHJ1ZSwgZW50cnkuZGVzdGluYXRpb25SZWxhdGl2ZVBhdGgpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG1hcmtkb3duUGF0aCBvZiBzZWxlY3RlZE1hcmtkb3duUGF0aHMpIHtcbiAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKG1hcmtkb3duUGF0aCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXJrZG93bkZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChtYXJrZG93blBhdGgpO1xuICAgICAgaWYgKG1hcmtkb3duRmlsZSAmJiBpc01hcmtkb3duRmlsZShtYXJrZG93bkZpbGUpKSB7XG4gICAgICAgIGRyYWZ0RW50cmllcy5zZXQobWFya2Rvd25QYXRoLCB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgbWFya2Rvd25GaWxlLCBmYWxzZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxlY3RlZFJldmlld1BhdGhzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNlbGVjdGVkUGF0aCBvZiBzZWxlY3RlZFJldmlld1BhdGhzKSB7XG4gICAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKHNlbGVjdGVkUGF0aCkgfHwgc2VsZWN0ZWRNYXJrZG93blBhdGhzLmhhcyhzZWxlY3RlZFBhdGgpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoc2VsZWN0ZWRQYXRoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkRmlsZSAmJiAhaXNNYXJrZG93bkZpbGUoc2VsZWN0ZWRGaWxlKSkge1xuICAgICAgICAgIGRyYWZ0RW50cmllcy5zZXQoc2VsZWN0ZWRQYXRoLCB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgc2VsZWN0ZWRGaWxlLCBmYWxzZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcykge1xuICAgICAgZm9yIChjb25zdCBtYXJrZG93blBhdGggb2Ygc2VsZWN0ZWRNYXJrZG93blBhdGhzKSB7XG4gICAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IHBsYW4uZGlyZWN0RGVwZW5kZW5jaWVzLmdldChtYXJrZG93blBhdGgpO1xuICAgICAgICBpZiAoIWRlcGVuZGVuY2llcykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYXR0YWNobWVudFBhdGggb2YgZGVwZW5kZW5jaWVzLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdGVkUmV2aWV3UGF0aHMgJiYgIXNlbGVjdGVkUmV2aWV3UGF0aHMuaGFzKGF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKGF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGF0dGFjaG1lbnRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoYXR0YWNobWVudFBhdGgpO1xuICAgICAgICAgIGlmIChhdHRhY2htZW50RmlsZSkge1xuICAgICAgICAgICAgZHJhZnRFbnRyaWVzLnNldChhdHRhY2htZW50UGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIGF0dGFjaG1lbnRGaWxlLCBmYWxzZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHN1bW1hcnk6IFRyYW5zZmVyU3VtbWFyeSA9IHtcbiAgICAgIHJlcXVlc3RlZEZpbGVDb3VudDogZHJhZnRFbnRyaWVzLnNpemUsXG4gICAgICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogMCxcbiAgICAgIG1vdmVkRmlsZUNvdW50OiAwLFxuICAgICAgc2tpcHBlZENvbmZsaWN0Q291bnQ6IDAsXG4gICAgICByZW5hbWVkQ291bnQ6IDAsXG4gICAgICBmYWlsZWRDb3VudDogMCxcbiAgICAgIHNraXBwZWRFbnRyaWVzOiBbXSxcbiAgICAgIHdhcm5pbmdzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzb2x2ZWRFbnRyaWVzID0gYXdhaXQgdGhpcy5yZXNvbHZlQ29uZmxpY3RzKHBsYW4sIFsuLi5kcmFmdEVudHJpZXMudmFsdWVzKCldLCBzdW1tYXJ5KTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiByZXNvbHZlZEVudHJpZXMpIHtcbiAgICAgIGRlc3RpbmF0aW9uTWFwLnNldChlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCwgZW50cnkuZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHJhbnNmZXJyZWRGaWxlczogVEZpbGVbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzb2x2ZWRFbnRyaWVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmRpcm5hbWUoZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKGVudHJ5Lm92ZXJ3cml0ZUV4aXN0aW5nKSB7XG4gICAgICAgICAgYXdhaXQgZnMucm0oZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbnRyeS5zaG91bGRSZXdyaXRlTGlua3MpIHtcbiAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5jYWNoZWRSZWFkKGVudHJ5LnNvdXJjZUZpbGUpO1xuICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLnJld3JpdGVNYXJrZG93bkxpbmtzKGNvbnRlbnQsIGVudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLCBlbnRyeS5kZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBkZXN0aW5hdGlvbk1hcCk7XG4gICAgICAgICAgY29uc3QgdGFnUmVzdWx0ID0gdGhpcy5hcHBseURlc3RpbmF0aW9uVGFncyhjb250ZW50LCBtb2RlLCBlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCwgc3VtbWFyeSk7XG4gICAgICAgICAgY29udGVudCA9IHRhZ1Jlc3VsdC5jb250ZW50O1xuICAgICAgICAgIGlmICh0YWdSZXN1bHQud2FybmluZykge1xuICAgICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKHRhZ1Jlc3VsdC53YXJuaW5nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoLCBjb250ZW50LCBcInV0ZjhcIik7XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gXCJjb3B5XCIgJiYgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBzb3VyY2VUYWdSZXN1bHQgPSBhd2FpdCB0aGlzLnRhZ1NvdXJjZU1hcmtkb3duKGVudHJ5LnNvdXJjZUZpbGUsIHRoaXMuZ2V0VGFnc0Zvck1vZGUobW9kZSkpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZVRhZ1Jlc3VsdCkge1xuICAgICAgICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goc291cmNlVGFnUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuY29weUZpbGUoZW50cnkuc291cmNlQWJzb2x1dGVQYXRoLCBlbnRyeS5kZXN0aW5hdGlvbkFic29sdXRlUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2ZlcnJlZEZpbGVzLnB1c2goZW50cnkuc291cmNlRmlsZSk7XG4gICAgICAgIHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgKz0gMTtcbiAgICAgICAgaWYgKGVudHJ5Lndhc1JlbmFtZWQpIHtcbiAgICAgICAgICBzdW1tYXJ5LnJlbmFtZWRDb3VudCArPSAxO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5LmZhaWxlZENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIHRyYW5zZmVyICR7ZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGh9OiAke3RoaXMudG9FcnJvck1lc3NhZ2UoZXJyb3IsIFwiVW5rbm93biB0cmFuc2ZlciBlcnJvci5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1vZGUgPT09IFwibW92ZVwiKSB7XG4gICAgICBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50ID0gYXdhaXQgdGhpcy5kZWxldGVNb3ZlZFNvdXJjZXModHJhbnNmZXJyZWRGaWxlcywgcGxhbi5zZWxlY3RlZEZvbGRlclBhdGhzLCBzdW1tYXJ5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VtbWFyeTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRHJhZnRFbnRyeShcbiAgICBwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbixcbiAgICBmaWxlOiBURmlsZSxcbiAgICBpc0V4cGxpY2l0U2VsZWN0aW9uOiBib29sZWFuLFxuICAgIGV4cGxpY2l0RGVzdGluYXRpb25SZWxhdGl2ZVBhdGg/OiBzdHJpbmcsXG4gICk6IERyYWZ0VHJhbnNmZXJFbnRyeSB7XG4gICAgY29uc3Qgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGggPSBub3JtYWxpemVQYXRoKGZpbGUucGF0aCk7XG4gICAgY29uc3Qgc291cmNlQWJzb2x1dGVQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHBhdGguam9pbihwbGFuLnNvdXJjZVZhdWx0Um9vdCwgLi4uc291cmNlVmF1bHRSZWxhdGl2ZVBhdGguc3BsaXQoXCIvXCIpKSk7XG4gICAgY29uc3QgZGVzdGluYXRpb25CYXNlID0gIWlzRXhwbGljaXRTZWxlY3Rpb24gJiYgIWlzTWFya2Rvd25GaWxlKGZpbGUpXG4gICAgICA/IHBsYW4udGFyZ2V0LmVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoXG4gICAgICA6IHBsYW4udGFyZ2V0LmRlc3RpbmF0aW9uUGF0aDtcbiAgICBjb25zdCByZWxhdGl2ZURlc3RpbmF0aW9uID0gZXhwbGljaXREZXN0aW5hdGlvblJlbGF0aXZlUGF0aCA/PyBwYXRoLnBvc2l4LmJhc2VuYW1lKHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChcbiAgICAgIHBhdGguam9pbihkZXN0aW5hdGlvbkJhc2UsIC4uLm5vcm1hbGl6ZVBhdGgocmVsYXRpdmVEZXN0aW5hdGlvbikuc3BsaXQoXCIvXCIpKSxcbiAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2VGaWxlOiBmaWxlLFxuICAgICAgc291cmNlQWJzb2x1dGVQYXRoLFxuICAgICAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgsXG4gICAgICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCxcbiAgICAgIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHRvVmF1bHRSZWxhdGl2ZVBhdGgocGxhbi50YXJnZXQudmF1bHRQYXRoLCBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCksXG4gICAgICBzaG91bGRSZXdyaXRlTGlua3M6IGlzTWFya2Rvd25GaWxlKGZpbGUpLFxuICAgICAgaXNFeHBsaWNpdFNlbGVjdGlvbixcbiAgICAgIHdhc1JlbmFtZWQ6IGZhbHNlLFxuICAgICAgb3ZlcndyaXRlRXhpc3Rpbmc6IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGlzU2VsZWN0ZWRNYXJrZG93blBhdGgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XG4gICAgcmV0dXJuICEhZmlsZSAmJiBpc01hcmtkb3duRmlsZShmaWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUNvbmZsaWN0cyhcbiAgICBwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbixcbiAgICBlbnRyaWVzOiBEcmFmdFRyYW5zZmVyRW50cnlbXSxcbiAgICBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnksXG4gICk6IFByb21pc2U8RmluYWxpemVkVHJhbnNmZXJFbnRyeVtdPiB7XG4gICAgY29uc3QgcmVzZXJ2ZWRQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHJlc29sdmVkOiBGaW5hbGl6ZWRUcmFuc2ZlckVudHJ5W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgY29uc3QgZGVzaXJlZFBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChlbnRyeS5zb3VyY2VBYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3QgYWxyZWFkeVJlc2VydmVkID0gcmVzZXJ2ZWRQYXRocy5oYXMoZGVzaXJlZFBhdGgpO1xuICAgICAgY29uc3QgYWxyZWFkeUV4aXN0cyA9IGF3YWl0IHRoaXMucGF0aEV4aXN0cyhkZXNpcmVkUGF0aCk7XG4gICAgICBjb25zdCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbiA9IGRlc2lyZWRQYXRoID09PSBzb3VyY2VQYXRoO1xuICAgICAgY29uc3QgaGFzQ29uZmxpY3QgPSBhbHJlYWR5UmVzZXJ2ZWQgfHwgYWxyZWFkeUV4aXN0cyB8fCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbjtcblxuICAgICAgaWYgKGhhc0NvbmZsaWN0ICYmIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3kgPT09IFwic2tpcFwiKSB7XG4gICAgICAgIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgKz0gMTtcbiAgICAgICAgc3VtbWFyeS5za2lwcGVkRW50cmllcy5wdXNoKGVudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICAgICAgaWYgKHNvdXJjZUVxdWFsc0Rlc3RpbmF0aW9uKSB7XG4gICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBTa2lwcGVkICR7ZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGh9IGJlY2F1c2Ugc291cmNlIGFuZCBkZXN0aW5hdGlvbiBhcmUgaWRlbnRpY2FsLmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgU2tpcHBlZCAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofSBiZWNhdXNlICR7ZGVzaXJlZFBhdGh9IGFscmVhZHkgZXhpc3RzLmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgZmluYWxQYXRoID0gZGVzaXJlZFBhdGg7XG4gICAgICBsZXQgd2FzUmVuYW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKGhhc0NvbmZsaWN0ICYmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5ID09PSBcImF1dG8tcmVuYW1lXCIgfHwgYWxyZWFkeVJlc2VydmVkIHx8IHNvdXJjZUVxdWFsc0Rlc3RpbmF0aW9uKSkge1xuICAgICAgICBmaW5hbFBhdGggPSBhd2FpdCB0aGlzLmZpbmRBdmFpbGFibGVQYXRoKGRlc2lyZWRQYXRoLCByZXNlcnZlZFBhdGhzLCBzb3VyY2VQYXRoKTtcbiAgICAgICAgd2FzUmVuYW1lZCA9IGZpbmFsUGF0aCAhPT0gZGVzaXJlZFBhdGg7XG4gICAgICB9XG5cbiAgICAgIHJlc2VydmVkUGF0aHMuYWRkKGZpbmFsUGF0aCk7XG4gICAgICByZXNvbHZlZC5wdXNoKHtcbiAgICAgICAgLi4uZW50cnksXG4gICAgICAgIGRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoOiBmaW5hbFBhdGgsXG4gICAgICAgIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHRvVmF1bHRSZWxhdGl2ZVBhdGgocGxhbi50YXJnZXQudmF1bHRQYXRoLCBmaW5hbFBhdGgpLFxuICAgICAgICB3YXNSZW5hbWVkLFxuICAgICAgICBvdmVyd3JpdGVFeGlzdGluZzogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9PT0gXCJvdmVyd3JpdGVcIiAmJiAhd2FzUmVuYW1lZCAmJiBhbHJlYWR5RXhpc3RzLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSByZXdyaXRlTWFya2Rvd25MaW5rcyhcbiAgICBjb250ZW50OiBzdHJpbmcsXG4gICAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZyxcbiAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gICAgZGVzdGluYXRpb25NYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4sXG4gICk6IHN0cmluZyB7XG4gICAgbGV0IHJld3JpdHRlbiA9IGNvbnRlbnQucmVwbGFjZSgvKCEpP1xcW1xcWyhbXlxcXV0rKVxcXVxcXS9nLCAobWF0Y2gsIGVtYmVkUHJlZml4OiBzdHJpbmcgfCB1bmRlZmluZWQsIGlubmVyOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGFsaWFzU2VwYXJhdG9yID0gaW5uZXIuaW5kZXhPZihcInxcIik7XG4gICAgICBjb25zdCBsaW5rVGV4dCA9IGFsaWFzU2VwYXJhdG9yID49IDAgPyBpbm5lci5zbGljZSgwLCBhbGlhc1NlcGFyYXRvcikgOiBpbm5lcjtcbiAgICAgIGNvbnN0IGFsaWFzID0gYWxpYXNTZXBhcmF0b3IgPj0gMCA/IGlubmVyLnNsaWNlKGFsaWFzU2VwYXJhdG9yICsgMSkgOiBcIlwiO1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVSZWZlcmVuY2UobGlua1RleHQsIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFwcGVkUGF0aCA9IGRlc3RpbmF0aW9uTWFwLmdldChyZXNvbHZlZC50YXJnZXRGaWxlLnBhdGgpO1xuICAgICAgaWYgKCFtYXBwZWRQYXRoKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHRQYXRoID0gdGhpcy50b1dpa2lMaW5rUGF0aChkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBtYXBwZWRQYXRoLCByZXNvbHZlZC50YXJnZXRGaWxlLmV4dGVuc2lvbik7XG4gICAgICBjb25zdCByZWJ1aWx0ID0gYCR7bmV4dFBhdGh9JHtyZXNvbHZlZC5zdWJwYXRofSR7YWxpYXMgPyBgfCR7YWxpYXN9YCA6IFwiXCJ9YDtcbiAgICAgIHJldHVybiBgJHtlbWJlZFByZWZpeCA/PyBcIlwifVtbJHtyZWJ1aWx0fV1dYDtcbiAgICB9KTtcblxuICAgIHJld3JpdHRlbiA9IHJld3JpdHRlbi5yZXBsYWNlKC8oISk/XFxbKFteXFxdXSopXFxdXFwoKFteKV0rKVxcKS9nLCAobWF0Y2gsIGVtYmVkUHJlZml4OiBzdHJpbmcgfCB1bmRlZmluZWQsIGxhYmVsOiBzdHJpbmcsIHJhd0hyZWY6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgcGFyc2VkID0gdGhpcy5wYXJzZU1hcmtkb3duSHJlZihyYXdIcmVmKTtcbiAgICAgIGlmICghcGFyc2VkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUmVmZXJlbmNlKHBhcnNlZC5wYXRoLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hcHBlZFBhdGggPSBkZXN0aW5hdGlvbk1hcC5nZXQocmVzb2x2ZWQudGFyZ2V0RmlsZS5wYXRoKTtcbiAgICAgIGlmICghbWFwcGVkUGF0aCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCByZWxhdGl2ZUxpbmsgPSB0aGlzLnRvUmVsYXRpdmVMaW5rKGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGgsIG1hcHBlZFBhdGgpO1xuICAgICAgY29uc3QgcmVidWlsdEhyZWYgPSBgJHt0aGlzLmVuY29kZU1hcmtkb3duTGlua1BhdGgocmVsYXRpdmVMaW5rKX0ke3Jlc29sdmVkLnN1YnBhdGh9YDtcbiAgICAgIGNvbnN0IHdyYXBwZWRIcmVmID0gcGFyc2VkLndyYXBwZWRJbkFuZ2xlcyA/IGA8JHtyZWJ1aWx0SHJlZn0+YCA6IHJlYnVpbHRIcmVmO1xuICAgICAgcmV0dXJuIGAke2VtYmVkUHJlZml4ID8/IFwiXCJ9WyR7bGFiZWx9XSgke3dyYXBwZWRIcmVmfSlgO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJld3JpdHRlbjtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVJlZmVyZW5jZShsaW5rVGV4dDogc3RyaW5nLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nKTogeyB0YXJnZXRGaWxlOiBURmlsZTsgc3VicGF0aDogc3RyaW5nIH0gfCBudWxsIHtcbiAgICBjb25zdCBoYXNoSW5kZXggPSBsaW5rVGV4dC5pbmRleE9mKFwiI1wiKTtcbiAgICBjb25zdCByYXdQYXRoID0gaGFzaEluZGV4ID49IDAgPyBsaW5rVGV4dC5zbGljZSgwLCBoYXNoSW5kZXgpIDogbGlua1RleHQ7XG4gICAgY29uc3Qgc3VicGF0aCA9IGhhc2hJbmRleCA+PSAwID8gbGlua1RleHQuc2xpY2UoaGFzaEluZGV4KSA6IFwiXCI7XG4gICAgY29uc3QgZGVjb2RlZFBhdGggPSBkZWNvZGVVUklDb21wb25lbnQocmF3UGF0aC50cmltKCkpO1xuICAgIGlmIChkZWNvZGVkUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZ2V0TGlua3BhdGgoZGVjb2RlZFBhdGgpLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgaWYgKCF0YXJnZXRGaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHsgdGFyZ2V0RmlsZSwgc3VicGF0aCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hcmtkb3duSHJlZihyYXdIcmVmOiBzdHJpbmcpOiBQYXJzZWRNYXJrZG93bkhyZWYgfCBudWxsIHtcbiAgICBjb25zdCB0cmltbWVkID0gcmF3SHJlZi50cmltKCk7XG4gICAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aChcIiNcIikgfHwgL15bYS16XSs6L2kudGVzdCh0cmltbWVkKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHdyYXBwZWRJbkFuZ2xlcyA9IHRyaW1tZWQuc3RhcnRzV2l0aChcIjxcIikgJiYgdHJpbW1lZC5lbmRzV2l0aChcIj5cIikgJiYgdHJpbW1lZC5sZW5ndGggPiAyO1xuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiB3cmFwcGVkSW5BbmdsZXMgPyB0cmltbWVkLnNsaWNlKDEsIC0xKSA6IHRyaW1tZWQsXG4gICAgICB3cmFwcGVkSW5BbmdsZXMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdG9XaWtpTGlua1BhdGgoY3VycmVudERlc3RpbmF0aW9uOiBzdHJpbmcsIHRhcmdldERlc3RpbmF0aW9uOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWxhdGl2ZUxpbmsgPSB0aGlzLnRvUmVsYXRpdmVMaW5rKGN1cnJlbnREZXN0aW5hdGlvbiwgdGFyZ2V0RGVzdGluYXRpb24pO1xuICAgIHJldHVybiBleHRlbnNpb24udG9Mb3dlckNhc2UoKSA9PT0gXCJtZFwiID8gcmVsYXRpdmVMaW5rLnJlcGxhY2UoL1xcLm1kJC9pLCBcIlwiKSA6IHJlbGF0aXZlTGluaztcbiAgfVxuXG4gIHByaXZhdGUgdG9SZWxhdGl2ZUxpbmsoZnJvbUZpbGU6IHN0cmluZywgdG9GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbGF0aXZlID0gbm9ybWFsaXplUGF0aChwYXRoLnBvc2l4LnJlbGF0aXZlKHBhdGgucG9zaXguZGlybmFtZShmcm9tRmlsZSksIHRvRmlsZSkpO1xuICAgIHJldHVybiByZWxhdGl2ZS5sZW5ndGggPiAwID8gcmVsYXRpdmUgOiBwYXRoLnBvc2l4LmJhc2VuYW1lKHRvRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGVuY29kZU1hcmtkb3duTGlua1BhdGgobGlua1BhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVuY29kZVVSSShsaW5rUGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RGVzdGluYXRpb25UYWdzKGNvbnRlbnQ6IHN0cmluZywgbW9kZTogVHJhbnNmZXJNb2RlLCBzb3VyY2VQYXRoOiBzdHJpbmcsIHN1bW1hcnk6IFRyYW5zZmVyU3VtbWFyeSk6IEZyb250bWF0dGVyVGFnUmVzdWx0IHtcbiAgICBjb25zdCB0YWdzID0gdGhpcy5nZXRUYWdzRm9yTW9kZShtb2RlKTtcbiAgICBpZiAodGFncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB7IGNvbnRlbnQgfTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hZGRUYWdzVG9NYXJrZG93bkNvbnRlbnQoY29udGVudCwgdGFncyk7XG4gICAgaWYgKHJlc3VsdC53YXJuaW5nKSB7XG4gICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYFNraXBwZWQgdGFnZ2luZyAke3NvdXJjZVBhdGh9OiAke3Jlc3VsdC53YXJuaW5nfWApO1xuICAgICAgcmV0dXJuIHsgY29udGVudCB9O1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB0YWdTb3VyY2VNYXJrZG93bihmaWxlOiBURmlsZSwgdGFnczogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBpZiAoIWlzTWFya2Rvd25GaWxlKGZpbGUpIHx8IHRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY3VycmVudENvbnRlbnQgPSBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmFkZFRhZ3NUb01hcmtkb3duQ29udGVudChjdXJyZW50Q29udGVudCwgdGFncyk7XG4gICAgaWYgKHJlc3VsdC53YXJuaW5nKSB7XG4gICAgICByZXR1cm4gYFNraXBwZWQgdGFnZ2luZyBzb3VyY2UgZmlsZSAke2ZpbGUucGF0aH06ICR7cmVzdWx0Lndhcm5pbmd9YDtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5jb250ZW50ICE9PSBjdXJyZW50Q29udGVudCkge1xuICAgICAgY29uc3QgZnJvbnRtYXR0ZXJSYW5nZSA9IGNvbGxlY3RGcm9udG1hdHRlclJhbmdlKGN1cnJlbnRDb250ZW50KTtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGZyb250bWF0dGVyUmFuZ2UgJiYgZnJvbnRtYXR0ZXJSYW5nZSAhPT0gXCJpbnZhbGlkXCJcbiAgICAgICAgPyBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJSYW5nZS5ib2R5KVxuICAgICAgICA6IFwidW5rbm93blwiO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgICAgIGNvbnN0IG1lcmdlZFRhZ3MgPSBqb2luVGFnVmFsdWVzKGV4dHJhY3RFeGlzdGluZ1RhZ3MoZnJvbnRtYXR0ZXIudGFncyksIHRhZ3MpO1xuICAgICAgICAgIGlmIChtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZGVsZXRlIGZyb250bWF0dGVyLnRhZ3M7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGZvcm1hdCA9PT0gXCJjb21tYVwiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiLCBcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmb3JtYXQgPT09IFwic3BhY2VcIikge1xuICAgICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiBcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGZyb250bWF0dGVyLnRhZ3MpIHx8IGZvcm1hdCA9PT0gXCJhcnJheVwiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcm9udG1hdHRlci50YWdzID09PSBcInN0cmluZ1wiIHx8IGZvcm1hdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3MubGVuZ3RoID09PSAxID8gbWVyZ2VkVGFnc1swXSA6IG1lcmdlZFRhZ3M7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMSA/IG1lcmdlZFRhZ3NbMF0gOiBtZXJnZWRUYWdzO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gYFNraXBwZWQgdGFnZ2luZyBzb3VyY2UgZmlsZSAke2ZpbGUucGF0aH06IGludmFsaWQgZnJvbnRtYXR0ZXIuYDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFkZFRhZ3NUb01hcmtkb3duQ29udGVudChjb250ZW50OiBzdHJpbmcsIHRhZ3M6IHN0cmluZ1tdKTogRnJvbnRtYXR0ZXJUYWdSZXN1bHQge1xuICAgIGNvbnN0IGZyb250bWF0dGVyUmFuZ2UgPSBjb2xsZWN0RnJvbnRtYXR0ZXJSYW5nZShjb250ZW50KTtcbiAgICBpZiAoZnJvbnRtYXR0ZXJSYW5nZSA9PT0gXCJpbnZhbGlkXCIpIHtcbiAgICAgIHJldHVybiB7IGNvbnRlbnQsIHdhcm5pbmc6IFwiaW52YWxpZCBmcm9udG1hdHRlci5cIiB9O1xuICAgIH1cblxuICAgIGNvbnN0IGJ1aWxkRnJvbnRtYXR0ZXIgPSAoZnJvbnRtYXR0ZXJCb2R5OiBzdHJpbmcgfCBudWxsKTogRnJvbnRtYXR0ZXJUYWdSZXN1bHQgPT4ge1xuICAgICAgY29uc3QgZm9ybWF0ID0gZnJvbnRtYXR0ZXJCb2R5ID8gZ2V0RXhpc3RpbmdUYWdGb3JtYXR0aW5nKGZyb250bWF0dGVyQm9keSkgOiBcInVua25vd25cIjtcbiAgICAgIGxldCBwYXJzZWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgICB0cnkge1xuICAgICAgICBwYXJzZWQgPSBmcm9udG1hdHRlckJvZHkgPyAoKHBhcnNlWWFtbChmcm9udG1hdHRlckJvZHkpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA/PyB7fSkgOiB7fTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4geyBjb250ZW50LCB3YXJuaW5nOiBcImludmFsaWQgZnJvbnRtYXR0ZXIuXCIgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1lcmdlZFRhZ3MgPSBqb2luVGFnVmFsdWVzKGV4dHJhY3RFeGlzdGluZ1RhZ3MocGFyc2VkLnRhZ3MpLCB0YWdzKTtcbiAgICAgIGlmIChtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4geyBjb250ZW50IH07XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQudGFncykpIHtcbiAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyc2VkLnRhZ3MgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgaWYgKGZvcm1hdCA9PT0gXCJjb21tYVwiKSB7XG4gICAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtYXQgPT09IFwic3BhY2VcIikge1xuICAgICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiBcIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncy5sZW5ndGggPT09IDEgPyBtZXJnZWRUYWdzWzBdIDogbWVyZ2VkVGFncztcbiAgICAgIH1cbiAgICAgIGNvbnN0IHlhbWxCb2R5ID0gc3RyaW5naWZ5WWFtbChwYXJzZWQpLnRyaW1FbmQoKTtcbiAgICAgIGNvbnN0IG5leHRGcm9udG1hdHRlciA9IGAtLS1cXG4ke3lhbWxCb2R5fVxcbi0tLVxcbmA7XG4gICAgICBpZiAoIWZyb250bWF0dGVyUmFuZ2UpIHtcbiAgICAgICAgcmV0dXJuIHsgY29udGVudDogYCR7bmV4dEZyb250bWF0dGVyfSR7Y29udGVudH1gIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiBgJHtuZXh0RnJvbnRtYXR0ZXJ9JHtjb250ZW50LnNsaWNlKGZyb250bWF0dGVyUmFuZ2UucmFuZ2VbMV0pfWAsXG4gICAgICB9O1xuICAgIH07XG5cbiAgICBpZiAoIWZyb250bWF0dGVyUmFuZ2UpIHtcbiAgICAgIHJldHVybiBidWlsZEZyb250bWF0dGVyKG51bGwpO1xuICAgIH1cbiAgICByZXR1cm4gYnVpbGRGcm9udG1hdHRlcihmcm9udG1hdHRlclJhbmdlLmJvZHkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUYWdzRm9yTW9kZShtb2RlOiBUcmFuc2Zlck1vZGUpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIGNsZWFuVGFnSW5wdXQobW9kZSA9PT0gXCJjb3B5XCIgPyB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yQ29waWVkRWxlbWVudHMgOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yTW92ZWRFbGVtZW50cyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGRlbGV0ZU1vdmVkU291cmNlcyh0cmFuc2ZlcnJlZEZpbGVzOiBURmlsZVtdLCBzZWxlY3RlZEZvbGRlclBhdGhzOiBzdHJpbmdbXSwgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB1bmlxdWVGaWxlcyA9IFsuLi5uZXcgTWFwKHRyYW5zZmVycmVkRmlsZXMubWFwKChmaWxlKSA9PiBbZmlsZS5wYXRoLCBmaWxlXSkpLnZhbHVlcygpXS5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQucGF0aC5sZW5ndGggLSBsZWZ0LnBhdGgubGVuZ3RoKTtcbiAgICBsZXQgZGVsZXRlZENvdW50ID0gMDtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiB1bmlxdWVGaWxlcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY3VycmVudEZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlLnBhdGgpO1xuICAgICAgICBpZiAoIWN1cnJlbnRGaWxlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmRlbGV0ZShjdXJyZW50RmlsZSk7XG4gICAgICAgIGRlbGV0ZWRDb3VudCArPSAxO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3VtbWFyeS5mYWlsZWRDb3VudCArPSAxO1xuICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYEZhaWxlZCB0byBkZWxldGUgc291cmNlIGZpbGUgJHtmaWxlLnBhdGh9OiAke3RoaXMudG9FcnJvck1lc3NhZ2UoZXJyb3IsIFwiQ291bGQgbm90IGRlbGV0ZSBzb3VyY2UgZmlsZS5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc29ydGVkRm9sZGVycyA9IFsuLi5zZWxlY3RlZEZvbGRlclBhdGhzXS5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQubGVuZ3RoIC0gbGVmdC5sZW5ndGgpO1xuICAgIGZvciAoY29uc3QgZm9sZGVyUGF0aCBvZiBzb3J0ZWRGb2xkZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0Rm9sZGVyQnlQYXRoKGZvbGRlclBhdGgpO1xuICAgICAgICBpZiAoIWZvbGRlciB8fCBmb2xkZXIuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5kZWxldGUoZm9sZGVyLCB0cnVlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIGRlbGV0ZSBzb3VyY2UgZm9sZGVyICR7Zm9sZGVyUGF0aH06ICR7dGhpcy50b0Vycm9yTWVzc2FnZShlcnJvciwgXCJDb3VsZCBub3QgZGVsZXRlIHNvdXJjZSBmb2xkZXIuXCIpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWxldGVkQ291bnQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHBhdGhFeGlzdHMoY2FuZGlkYXRlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmFjY2VzcyhjYW5kaWRhdGVQYXRoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmluZEF2YWlsYWJsZVBhdGgoY2FuZGlkYXRlUGF0aDogc3RyaW5nLCByZXNlcnZlZFBhdGhzOiBTZXQ8c3RyaW5nPiwgc291cmNlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXRoLnBhcnNlKGNhbmRpZGF0ZVBhdGgpO1xuICAgIGxldCBpbmRleCA9IDE7XG4gICAgbGV0IG5leHRQYXRoID0gY2FuZGlkYXRlUGF0aDtcbiAgICB3aGlsZSAocmVzZXJ2ZWRQYXRocy5oYXMobmV4dFBhdGgpIHx8IGF3YWl0IHRoaXMucGF0aEV4aXN0cyhuZXh0UGF0aCkgfHwgbmV4dFBhdGggPT09IHNvdXJjZVBhdGgpIHtcbiAgICAgIG5leHRQYXRoID0gcGF0aC5qb2luKHBhcnNlZC5kaXIsIGAke3BhcnNlZC5uYW1lfSAke2luZGV4fSR7cGFyc2VkLmV4dH1gKTtcbiAgICAgIGluZGV4ICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBuZXh0UGF0aDtcbiAgfVxuXG4gIHByaXZhdGUgdG9FcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24sIGZhbGxiYWNrOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IGZhbGxiYWNrO1xuICB9XG59XG5cbmNsYXNzIFRhcmdldFZhdWx0U3VnZ2VzdE1vZGFsIGV4dGVuZHMgRnV6enlTdWdnZXN0TW9kYWw8RGVzdGluYXRpb25Db25maWc+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXRzOiBEZXN0aW5hdGlvbkNvbmZpZ1tdLFxuICAgIHBsYWNlaG9sZGVyOiBzdHJpbmcsXG4gICAgcHJpdmF0ZSByZWFkb25seSBvbkNob29zZVRhcmdldDogKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpID0+IHZvaWQsXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5zZXRQbGFjZWhvbGRlcihwbGFjZWhvbGRlcik7XG4gICAgdGhpcy5lbXB0eVN0YXRlVGV4dCA9IFwiTm8gZGVzdGluYXRpb24gdmF1bHRzIGF2YWlsYWJsZS5cIjtcbiAgfVxuXG4gIGdldEl0ZW1zKCk6IERlc3RpbmF0aW9uQ29uZmlnW10ge1xuICAgIHJldHVybiB0aGlzLnRhcmdldHM7XG4gIH1cblxuICBnZXRJdGVtVGV4dCh0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZ2V0RGVzdGluYXRpb25EaXNwbGF5TmFtZSh0YXJnZXQpO1xuICB9XG5cbiAgcmVuZGVyU3VnZ2VzdGlvbihtYXRjaDogRnV6enlNYXRjaDxEZXN0aW5hdGlvbkNvbmZpZz4sIGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHRhcmdldCA9IG1hdGNoLml0ZW07XG4gICAgZWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zLXZhdWx0LXN1Z2dlc3QtdGl0bGVcIiwgdGV4dDogZ2V0RGVzdGluYXRpb25EaXNwbGF5TmFtZSh0YXJnZXQpIH0pO1xuICAgIGNvbnN0IGRldGFpbCA9IFt0YXJnZXQudmF1bHRQYXRoLnRyaW0oKSwgdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aC50cmltKCldLmZpbHRlcigoZW50cnkpID0+IGVudHJ5Lmxlbmd0aCA+IDApLmpvaW4oXCIgLT4gXCIpO1xuICAgIGlmIChkZXRhaWwubGVuZ3RoID4gMCkge1xuICAgICAgZWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zLXZhdWx0LXN1Z2dlc3QtZGV0YWlsXCIsIHRleHQ6IGRldGFpbCB9KTtcbiAgICB9XG4gIH1cblxuICBvbkNob29zZUl0ZW0odGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIHRoaXMub25DaG9vc2VUYXJnZXQodGFyZ2V0KTtcbiAgfVxufVxuXG5jbGFzcyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBzZWxlY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVFbGVtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW5wdXRFbGVtZW50PigpO1xuICBwcml2YXRlIHJlc29sdmVQcm9taXNlOiAoKHJlc3VsdDogUmV2aWV3TW9kYWxSZXN1bHQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSByb290czogUmV2aWV3Tm9kZVtdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29uZmxpY3RTdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2Ygcm9vdHMpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU5vZGVTdGF0ZShyb290KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB3YWl0Rm9yUmVzdWx0KCk6IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcInRyYW5zLXZhdWx0LXJldmlldy1tb2RhbFwiKTtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIlJldmlldyBsaW5rZWQgbm90ZXNcIik7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBjb25mbGljdE5vdGljZSA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFucy12YXVsdC1yZXZpZXctY29uZmxpY3Qtbm90aWNlXCIgfSk7XG4gICAgY29uZmxpY3ROb3RpY2UuY3JlYXRlU3Bhbih7XG4gICAgICBjbHM6IFwidHJhbnMtdmF1bHQtcmV2aWV3LWNvbmZsaWN0LWJhZGdlXCIsXG4gICAgICB0ZXh0OiBgQ29uZmxpY3QgaGFuZGxpbmc6ICR7Z2V0Q29uZmxpY3RTdHJhdGVneUxhYmVsKHRoaXMuY29uZmxpY3RTdHJhdGVneSl9YCxcbiAgICB9KTtcbiAgICBjb25mbGljdE5vdGljZS5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInRyYW5zLXZhdWx0LXJldmlldy1jb25mbGljdC10ZXh0XCIsXG4gICAgICB0ZXh0OiBnZXRDb25mbGljdFN0cmF0ZWd5RGVzY3JpcHRpb24odGhpcy5jb25mbGljdFN0cmF0ZWd5KSxcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJSZXZpZXcgZGlyZWN0IGxpbmtzIGFuZCBiYWNrbGlua3MgZm9yIHRoZSBzZWxlY3RlZCBNYXJrZG93biBub3Rlcy4gVGhlIHRyYW5zZmVyIGluY2x1ZGVzIGV2ZXJ5IG5vdGUgaW5zdGFuY2UgdGhhdCByZW1haW5zIHNlbGVjdGVkLlwiLFxuICAgIH0pO1xuICAgIGNvbnN0IHRyZWUgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnMtdmF1bHQtcmV2aWV3LXRyZWVcIiB9KTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgdGhpcy5yb290cykge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKHRyZWUsIHJvb3QsIDApO1xuICAgIH1cbiAgICBjb25zdCBhY3Rpb25zID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcIm1vZGFsLWJ1dHRvbi1jb250YWluZXJcIiB9KTtcbiAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcbiAgICBjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIHRoaXMuZmluaXNoKHsgY29uZmlybWVkOiBmYWxzZSwgc2VsZWN0ZWRQYXRoczogW10gfSk7XG4gICAgfSk7XG4gICAgY29uc3QgY29uZmlybUJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlRyYW5zZmVyIHNlbGVjdGVkIGl0ZW1zXCIgfSk7XG4gICAgY29uZmlybUJ1dHRvbi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XG4gICAgY29uZmlybUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5maW5pc2goe1xuICAgICAgICBjb25maXJtZWQ6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkUGF0aHM6IFsuLi50aGlzLmdldFNlbGVjdGVkUGF0aHMoKV0uc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlc29sdmVQcm9taXNlKSB7XG4gICAgICB0aGlzLmZpbmlzaCh7IGNvbmZpcm1lZDogZmFsc2UsIHNlbGVjdGVkUGF0aHM6IFtdIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZmluaXNoKHJlc3VsdDogUmV2aWV3TW9kYWxSZXN1bHQpOiB2b2lkIHtcbiAgICBjb25zdCByZXNvbHZlID0gdGhpcy5yZXNvbHZlUHJvbWlzZTtcbiAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgcmVzb2x2ZT8uKHJlc3VsdCk7XG4gIH1cblxuICBwcml2YXRlIGluaXRpYWxpemVOb2RlU3RhdGUobm9kZTogUmV2aWV3Tm9kZSk6IHZvaWQge1xuICAgIGlmIChub2RlLnR5cGUgPT09IFwibm90ZVwiIHx8IG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uU3RhdGUuc2V0KG5vZGUuaWQsIHRydWUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU5vZGVTdGF0ZShjaGlsZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJOb2RlKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgbm9kZTogUmV2aWV3Tm9kZSwgZGVwdGg6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGl0ZW0gPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnMtdmF1bHQtcmV2aWV3LW5vZGVcIiB9KTtcbiAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KFwiLS10cmFucy12YXVsdC1kZXB0aFwiLCBTdHJpbmcoZGVwdGgpKTtcbiAgICBjb25zdCByb3cgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogXCJ0cmFucy12YXVsdC1yZXZpZXctcm93XCIgfSk7XG4gICAgcm93LmFkZENsYXNzKGB0cmFucy12YXVsdC1yZXZpZXctcm93LSR7bm9kZS50eXBlfWApO1xuICAgIGNvbnN0IGNoZWNrYm94U2hlbGwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFucy12YXVsdC1jaGVja2JveC1zaGVsbFwiIH0pO1xuICAgIGNvbnN0IGNoZWNrYm94ID0gY2hlY2tib3hTaGVsbC5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJjaGVja2JveFwiIH0pO1xuICAgIHRoaXMubm9kZUVsZW1lbnRzLnNldChub2RlLmlkLCBjaGVja2JveCk7XG4gICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZU5vZGUobm9kZSwgY2hlY2tib3guY2hlY2tlZCk7XG4gICAgICB0aGlzLnJlZnJlc2hUcmVlKCk7XG4gICAgfSk7XG4gICAgY29uc3QgaW5kaWNhdG9yID0gY2hlY2tib3hTaGVsbC5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zLXZhdWx0LWNoZWNrLWluZGljYXRvclwiIH0pO1xuICAgIGNvbnN0IGljb25FbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zLXZhdWx0LXJldmlldy1pY29uXCIgfSk7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICBpZiAobm9kZS5kaXJlY3Rpb24pIHtcbiAgICAgICAgc2V0SWNvbihpY29uRWwsIG5vZGUuZGlyZWN0aW9uID09PSBcInRvXCIgPyBcImxpbmtzLWdvaW5nLW91dFwiIDogXCJsaW5rcy1jb21pbmctaW5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldEljb24oaWNvbkVsLCBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgPyBcImZpbGUtdGV4dFwiIDogXCJmaWxlXCIpO1xuICAgIH1cbiAgICBjb25zdCBsYWJlbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zLXZhdWx0LXJldmlldy1sYWJlbFwiLCB0ZXh0OiBub2RlLmxhYmVsIH0pO1xuICAgIGxhYmVsLmFkZENsYXNzKGB0cmFucy12YXVsdC1yZXZpZXctbGFiZWwtJHtub2RlLnR5cGV9YCk7XG5cbiAgICBjb25zdCBjaGlsZHJlbkNvbnRhaW5lciA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zLXZhdWx0LXJldmlldy1jaGlsZHJlblwiIH0pO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKGNoaWxkcmVuQ29udGFpbmVyLCBjaGlsZCwgZGVwdGggKyAxKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDaGVja2JveChub2RlLCBjaGVja2JveCwgaW5kaWNhdG9yKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFRyZWUoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUocm9vdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoTm9kZShub2RlOiBSZXZpZXdOb2RlKTogdm9pZCB7XG4gICAgY29uc3QgY2hlY2tib3ggPSB0aGlzLm5vZGVFbGVtZW50cy5nZXQobm9kZS5pZCk7XG4gICAgaWYgKGNoZWNrYm94KSB7XG4gICAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveC5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi50cmFucy12YXVsdC1jaGVjay1pbmRpY2F0b3JcIikgPz8gbnVsbDtcbiAgICAgIGlmIChpbmRpY2F0b3IpIHtcbiAgICAgICAgdGhpcy51cGRhdGVDaGVja2JveChub2RlLCBjaGVja2JveCwgaW5kaWNhdG9yKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLnJlZnJlc2hOb2RlKGNoaWxkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUNoZWNrYm94KG5vZGU6IFJldmlld05vZGUsIGNoZWNrYm94OiBIVE1MSW5wdXRFbGVtZW50LCBpbmRpY2F0b3I6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmdldE5vZGVTdGF0dXMobm9kZSk7XG4gICAgY2hlY2tib3guY2hlY2tlZCA9IHN0YXRlID09PSBcImNoZWNrZWRcIjtcbiAgICBjaGVja2JveC5pbmRldGVybWluYXRlID0gc3RhdGUgPT09IFwibWl4ZWRcIjtcbiAgICBpbmRpY2F0b3IudGV4dENvbnRlbnQgPSBzdGF0ZSA9PT0gXCJtaXhlZFwiID8gXCItXCIgOiBcIlwiO1xuICAgIGluZGljYXRvci50b2dnbGVDbGFzcyhcImlzLXZpc2libGVcIiwgc3RhdGUgPT09IFwibWl4ZWRcIik7XG4gICAgY2hlY2tib3guZGF0YXNldC5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXROb2RlU3RhdHVzKG5vZGU6IFJldmlld05vZGUpOiBcImNoZWNrZWRcIiB8IFwidW5jaGVja2VkXCIgfCBcIm1peGVkXCIge1xuICAgIGlmIChub2RlLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgcmV0dXJuIHRoaXMuY29tYmluZVN0YXR1c2VzKG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZCkgPT4gdGhpcy5nZXROb2RlU3RhdHVzKGNoaWxkKSkpO1xuICAgIH1cbiAgICBjb25zdCBzZWxmU2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGlvblN0YXRlLmdldChub2RlLmlkKSA/PyBmYWxzZTtcbiAgICBpZiAobm9kZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzZWxmU2VsZWN0ZWQgPyBcImNoZWNrZWRcIiA6IFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIGNvbnN0IGNoaWxkU3RhdHVzID0gdGhpcy5jb21iaW5lU3RhdHVzZXMobm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkKSA9PiB0aGlzLmdldE5vZGVTdGF0dXMoY2hpbGQpKSk7XG4gICAgaWYgKHNlbGZTZWxlY3RlZCAmJiBjaGlsZFN0YXR1cyA9PT0gXCJjaGVja2VkXCIpIHtcbiAgICAgIHJldHVybiBcImNoZWNrZWRcIjtcbiAgICB9XG4gICAgaWYgKCFzZWxmU2VsZWN0ZWQgJiYgY2hpbGRTdGF0dXMgPT09IFwidW5jaGVja2VkXCIpIHtcbiAgICAgIHJldHVybiBcInVuY2hlY2tlZFwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJtaXhlZFwiO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21iaW5lU3RhdHVzZXMoc3RhdHVzZXM6IEFycmF5PFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIj4pOiBcImNoZWNrZWRcIiB8IFwidW5jaGVja2VkXCIgfCBcIm1peGVkXCIge1xuICAgIGlmIChzdGF0dXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBcInVuY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoc3RhdHVzZXMuZXZlcnkoKHN0YXR1cykgPT4gc3RhdHVzID09PSBcImNoZWNrZWRcIikpIHtcbiAgICAgIHJldHVybiBcImNoZWNrZWRcIjtcbiAgICB9XG4gICAgaWYgKHN0YXR1c2VzLmV2ZXJ5KChzdGF0dXMpID0+IHN0YXR1cyA9PT0gXCJ1bmNoZWNrZWRcIikpIHtcbiAgICAgIHJldHVybiBcInVuY2hlY2tlZFwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJtaXhlZFwiO1xuICB9XG5cbiAgcHJpdmF0ZSB0b2dnbGVOb2RlKG5vZGU6IFJldmlld05vZGUsIGNoZWNrZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBpZiAobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICB0aGlzLnNlbGVjdGlvblN0YXRlLnNldChub2RlLmlkLCBjaGVja2VkKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLnRvZ2dsZU5vZGUoY2hpbGQsIGNoZWNrZWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2VsZWN0ZWRQYXRocygpOiBTZXQ8c3RyaW5nPiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgdGhpcy5yb290cykge1xuICAgICAgdGhpcy5jb2xsZWN0U2VsZWN0ZWRQYXRocyhyb290LCBzZWxlY3RlZCk7XG4gICAgfVxuICAgIHJldHVybiBzZWxlY3RlZDtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdFNlbGVjdGVkUGF0aHMobm9kZTogUmV2aWV3Tm9kZSwgc2luazogU2V0PHN0cmluZz4pOiB2b2lkIHtcbiAgICBpZiAoKG5vZGUudHlwZSA9PT0gXCJub3RlXCIgfHwgbm9kZS50eXBlID09PSBcImF0dGFjaG1lbnRcIikgJiYgbm9kZS5maWxlUGF0aCAmJiAodGhpcy5zZWxlY3Rpb25TdGF0ZS5nZXQobm9kZS5pZCkgPz8gZmFsc2UpKSB7XG4gICAgICBzaW5rLmFkZChub2RlLmZpbGVQYXRoKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLmNvbGxlY3RTZWxlY3RlZFBhdGhzKGNoaWxkLCBzaW5rKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNWYXVsdFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBUcmFuc1ZhdWx0UGx1Z2luLCBwcml2YXRlIHJlYWRvbmx5IGRlc3RpbmF0aW9uUmVzb2x2ZXI6IERlc3RpbmF0aW9uUmVzb2x2ZXIpIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcblxuICAgIHRoaXMuYWRkRHJvcGRvd25TZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIkNvbmZsaWN0IGhhbmRsaW5nXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJDaG9vc2Ugd2hldGhlciBleGlzdGluZyBkZXN0aW5hdGlvbiBmaWxlcyBhcmUgc2tpcHBlZCwgcmVuYW1lZCBhdXRvbWF0aWNhbGx5LCBvciBvdmVyd3JpdHRlbi5cIixcbiAgICAgIG9wdGlvbnM6IChPYmplY3QuZW50cmllcyhDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQSkgYXMgQXJyYXk8W0NvbmZsaWN0U3RyYXRlZ3ksIHR5cGVvZiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtDb25mbGljdFN0cmF0ZWd5XV0+KVxuICAgICAgICAubWFwKChbdmFsdWUsIG1ldGFdKSA9PiAoeyB2YWx1ZSwgbGFiZWw6IG1ldGEubGFiZWwgfSkpLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3ksXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3kgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIkluY2x1ZGUgbGlua2VkIGZpbGVzXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJJbmNsdWRlIGRpcmVjdGx5IHJlbGF0ZWQgbm90ZXMgYW5kIGxpbmtlZCBub24tTWFya2Rvd24gZmlsZXMgZnJvbSBzZWxlY3RlZCBub3Rlcy5cIixcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbmNsdWRlTGlua2VkRmlsZXMsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcyA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZERyb3Bkb3duU2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJSZXZpZXcgZGlhbG9nXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJDaG9vc2Ugd2hlbiB0byBzaG93IHRoZSB0cmFuc2ZlciByZXZpZXcgZGlhbG9nLlwiLFxuICAgICAgb3B0aW9uczogW1xuICAgICAgICB7IHZhbHVlOiBcImFsd2F5c1wiLCBsYWJlbDogXCJBbHdheXNcIiB9LFxuICAgICAgICB7IHZhbHVlOiBcImxpbmtlZC1vbmx5XCIsIGxhYmVsOiBcIk9ubHkgd2hlbiBub3RlcyBhcmUgbGlua2VkXCIgfSxcbiAgICAgICAgeyB2YWx1ZTogXCJuZXZlclwiLCBsYWJlbDogXCJOZXZlclwiIH0sXG4gICAgICBdLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJUYWdzIGZvciBjb3BpZWQgbm90ZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbW1hLXNlcGFyYXRlZCB0YWdzIGFkZGVkIHRvIHRyYW5zZmVycmVkIE1hcmtkb3duIGZpbGVzIHdoZW4gY29weWluZy5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiBcImNvcGllZCwgc2VudFwiLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JDb3BpZWRFbGVtZW50cyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0ZvckNvcGllZEVsZW1lbnRzID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVG9nZ2xlU2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJBbHNvIHRhZyBjb3BpZWQgc291cmNlIG5vdGVzXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJXcml0ZSB0aGUgY29uZmlndXJlZCBjb3B5IHRhZ3MgYmFjayBpbnRvIHNvdXJjZSBNYXJrZG93biBmaWxlcyBpbiB0aGUgYWN0aXZlIHZhdWx0LlwiLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLmFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50cyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiVGFncyBmb3IgbW92ZWQgbm90ZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbW1hLXNlcGFyYXRlZCB0YWdzIGFkZGVkIHRvIHRyYW5zZmVycmVkIE1hcmtkb3duIGZpbGVzIHdoZW4gbW92aW5nLlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IFwibW92ZWQsIGFyY2hpdmVkXCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0Zvck1vdmVkRWxlbWVudHMsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JNb3ZlZEVsZW1lbnRzID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiRGVzdGluYXRpb24gdmF1bHRzXCIpLnNldEhlYWRpbmcoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJVc2UgYWJzb2x1dGUgcGF0aHMuIERlc3RpbmF0aW9uIGFuZCBhdHRhY2htZW50IHBhdGhzIG11c3Qgc3RheSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0IHJvb3QuXCIsXG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IHRhcmdldCBvZiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRzKSB7XG4gICAgICB0aGlzLnJlbmRlckRlc3RpbmF0aW9uQ2FyZChjb250YWluZXJFbCwgdGFyZ2V0KTtcbiAgICB9XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQWRkIGRlc3RpbmF0aW9uXCIpXG4gICAgICAuc2V0RGVzYyhcIkNyZWF0ZSBhbm90aGVyIGRlc3RpbmF0aW9uIHZhdWx0IGNvbmZpZ3VyYXRpb24uXCIpXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJBZGQgZGVzdGluYXRpb25cIikuc2V0Q3RhKCkub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cy5wdXNoKGNyZWF0ZUJsYW5rRGVzdGluYXRpb24oKSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVkaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckRlc3RpbmF0aW9uQ2FyZChjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zLXZhdWx0LXRhcmdldC1jYXJkXCIgfSk7XG4gICAgY29uc3QgdmFsaWRhdGlvbkhvc3QgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJ0cmFucy12YXVsdC10YXJnZXQtdmFsaWRhdGlvblwiIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjYXJkLCB7XG4gICAgICBuYW1lOiBcIkRlc3RpbmF0aW9uIG5hbWVcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkxhYmVsIHNob3duIGluIGRlc3RpbmF0aW9uIHNlbGVjdGlvbiBtZW51cy5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiBnZXREZXN0aW5hdGlvbkRpc3BsYXlOYW1lKHRhcmdldCksXG4gICAgICB2YWx1ZTogdGFyZ2V0Lm5hbWUsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC5uYW1lID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiRGVzdGluYXRpb24gdmF1bHQgcGF0aFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBvZiB0aGUgZGVzdGluYXRpb24gdmF1bHQuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0XCIpLFxuICAgICAgdmFsdWU6IHRhcmdldC52YXVsdFBhdGgsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC52YXVsdFBhdGggPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIGlmICh0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRGV0ZWN0ZWRBdHRhY2htZW50UGF0aCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY2FyZCwge1xuICAgICAgbmFtZTogXCJEZXN0aW5hdGlvbiBwYXRoXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJBYnNvbHV0ZSBwYXRoIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQgd2hlcmUgY29waWVkIGFuZCBtb3ZlZCBjb250ZW50IHdpbGwgbGFuZC5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiB0aGlzLmV4YW1wbGVQYXRoKFwiVmF1bHQvSW5ib3hcIiksXG4gICAgICB2YWx1ZTogdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiVXNlIGRlZmF1bHQgYXR0YWNobWVudCBsb2NhdGlvblwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiUmVhZCAub2JzaWRpYW4vYXBwLmpzb24gaW4gdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGFuZCByZXNvbHZlIHRoZSBhdHRhY2htZW50IGZvbGRlciBhdXRvbWF0aWNhbGx5LlwiLFxuICAgICAgdmFsdWU6IHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiA9IHZhbHVlO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZURldGVjdGVkQXR0YWNobWVudFBhdGgodGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWRpc3BsYXkoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoIXRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uKSB7XG4gICAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgICAgbmFtZTogXCJBdHRhY2htZW50IHBhdGhcIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGZvciBsaW5rZWQgbm9uLU1hcmtkb3duIGZpbGVzLlwiLFxuICAgICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0L0F0dGFjaG1lbnRzXCIpLFxuICAgICAgICB2YWx1ZTogdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLFxuICAgICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuXG4gICAgbmV3IFNldHRpbmcoY2FyZCkuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlXCIpLnNldFdhcm5pbmcoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKChlbnRyeSkgPT4gZW50cnkuaWQgIT09IHRhcmdldC5pZCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZGlzcGxheSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFkZFRleHRTZXR0aW5nKFxuICAgIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBjb25maWc6IHtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICBwbGFjZWhvbGRlcjogc3RyaW5nO1xuICAgICAgdmFsdWU6IHN0cmluZztcbiAgICAgIG9uQ2hhbmdlOiAodmFsdWU6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICB9LFxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKGNvbmZpZy5uYW1lKVxuICAgICAgLnNldERlc2MoY29uZmlnLmRlc2NyaXB0aW9uKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRQbGFjZWhvbGRlcihjb25maWcucGxhY2Vob2xkZXIpLnNldFZhbHVlKGNvbmZpZy52YWx1ZSkub25DaGFuZ2UoY29uZmlnLm9uQ2hhbmdlKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRUb2dnbGVTZXR0aW5nKFxuICAgIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBjb25maWc6IHtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogYm9vbGVhbjtcbiAgICAgIG9uQ2hhbmdlOiAodmFsdWU6IGJvb2xlYW4pID0+IFByb21pc2U8dm9pZD47XG4gICAgfSxcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShjb25maWcubmFtZSlcbiAgICAgIC5zZXREZXNjKGNvbmZpZy5kZXNjcmlwdGlvbilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUoY29uZmlnLnZhbHVlKS5vbkNoYW5nZShjb25maWcub25DaGFuZ2UpO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFkZERyb3Bkb3duU2V0dGluZzxUIGV4dGVuZHMgc3RyaW5nPihcbiAgICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgICAgb3B0aW9uczogQXJyYXk8eyB2YWx1ZTogVDsgbGFiZWw6IHN0cmluZyB9PjtcbiAgICAgIHZhbHVlOiBUO1xuICAgICAgb25DaGFuZ2U6ICh2YWx1ZTogVCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICB9LFxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKGNvbmZpZy5uYW1lKVxuICAgICAgLnNldERlc2MoY29uZmlnLmRlc2NyaXB0aW9uKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBjb25maWcub3B0aW9ucykge1xuICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihvcHRpb24udmFsdWUsIG9wdGlvbi5sYWJlbCk7XG4gICAgICAgIH1cbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLnZhbHVlKS5vbkNoYW5nZSgodmFsdWUpID0+IGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSBhcyBUKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZUFuZFJlZGlzcGxheSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvbihjb250YWluZXJFbCwgdGFyZ2V0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVmFsaWRhdGlvbihjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci52YWxpZGF0ZSh0YXJnZXQpO1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAodGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24gJiYgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBgRGV0ZWN0ZWQgYXR0YWNobWVudCBwYXRoOiAke3RhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCl9YCB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBlcnJvciBvZiBlcnJvcnMpIHtcbiAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBlcnJvciB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZURldGVjdGVkQXR0YWNobWVudFBhdGgodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRWYXVsdFBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC52YXVsdFBhdGgpO1xuICAgIGlmICghcGF0aC5pc0Fic29sdXRlKG5vcm1hbGl6ZWRWYXVsdFBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRhcmdldC5hdHRhY2htZW50UGF0aCA9IGF3YWl0IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci5yZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKG5vcm1hbGl6ZWRWYXVsdFBhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGFtcGxlUGF0aChzdWZmaXg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIiA/IGBDOlxcXFwke3N1ZmZpeC5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpfWAgOiBgL1VzZXJzL2V4YW1wbGUvJHtzdWZmaXgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIil9YDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmFuc1ZhdWx0UGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFRyYW5zVmF1bHRTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdGluYXRpb25SZXNvbHZlciA9IG5ldyBEZXN0aW5hdGlvblJlc29sdmVyKCk7XG4gIHByaXZhdGUgcGxhbm5lciA9IG5ldyBUcmFuc2ZlclBsYW5uZXIodGhpcywgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyKTtcbiAgcHJpdmF0ZSBleGVjdXRvciA9IG5ldyBUcmFuc2ZlckV4ZWN1dG9yKHRoaXMpO1xuICBwcml2YXRlIG5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIVBsYXRmb3JtLmlzRGVza3RvcEFwcCkge1xuICAgICAgbmV3IE5vdGljZShcIlRyYW5zIFZhdWx0IGlzIGF2YWlsYWJsZSBvbmx5IG9uIGRlc2t0b3AuXCIsIDEwMDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgVHJhbnNWYXVsdFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMsIHRoaXMuZGVzdGluYXRpb25SZXNvbHZlcikpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21tYW5kcygpO1xuICAgIHRoaXMucmVnaXN0ZXJDb250ZXh0TWVudXMoKTtcbiAgICB0aGlzLnJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHN0b3JlZCA9IChhd2FpdCB0aGlzLmxvYWREYXRhKCkpIGFzIChQYXJ0aWFsPFRyYW5zVmF1bHRTZXR0aW5ncz4gJiB7IHNob3dSZXZpZXdEaWFsb2c/OiBib29sZWFuIH0pIHwgbnVsbDtcbiAgICBjb25zdCBtaWdyYXRlZFJldmlld0RpYWxvZ01vZGU6IFJldmlld0RpYWxvZ01vZGUgfCB1bmRlZmluZWQgPSBzdG9yZWQ/LnJldmlld0RpYWxvZ01vZGVcbiAgICAgID8/ICh0eXBlb2Ygc3RvcmVkPy5zaG93UmV2aWV3RGlhbG9nID09PSBcImJvb2xlYW5cIlxuICAgICAgICA/IChzdG9yZWQuc2hvd1Jldmlld0RpYWxvZyA/IFwibGlua2VkLW9ubHlcIiA6IFwibmV2ZXJcIilcbiAgICAgICAgOiB1bmRlZmluZWQpO1xuICAgIHRoaXMuc2V0dGluZ3MgPSB7XG4gICAgICAuLi5ERUZBVUxUX1NFVFRJTkdTLFxuICAgICAgLi4uc3RvcmVkLFxuICAgICAgcmV2aWV3RGlhbG9nTW9kZTogbWlncmF0ZWRSZXZpZXdEaWFsb2dNb2RlID8/IERFRkFVTFRfU0VUVElOR1MucmV2aWV3RGlhbG9nTW9kZSxcbiAgICAgIHRhcmdldHM6IChzdG9yZWQ/LnRhcmdldHMgPz8gW10pLm1hcCgodGFyZ2V0KSA9PiAoe1xuICAgICAgICAuLi5jcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCksXG4gICAgICAgIC4uLnRhcmdldCxcbiAgICAgICAgaWQ6IHRhcmdldC5pZCA/PyBjcmVhdGVEZXN0aW5hdGlvbklkKCksXG4gICAgICB9KSksXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRoaXMuc2V0dGluZ3MudGFyZ2V0cykge1xuICAgICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LnZhdWx0UGF0aCk7XG4gICAgICBpZiAodGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24gJiYgcGF0aC5pc0Fic29sdXRlKG5vcm1hbGl6ZWRWYXVsdFBhdGgpKSB7XG4gICAgICAgIHRhcmdldC5hdHRhY2htZW50UGF0aCA9IGF3YWl0IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci5yZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKG5vcm1hbGl6ZWRWYXVsdFBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckNvbW1hbmRzKCk6IHZvaWQge1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJjb3B5LWFjdGl2ZS1maWxlLXRvLXZhdWx0XCIsXG4gICAgICBuYW1lOiBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBLmNvcHkuY29tbWFuZE5hbWUsXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHRoaXMuaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQoXCJjb3B5XCIsIGNoZWNraW5nKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwibW92ZS1hY3RpdmUtZmlsZS10by12YXVsdFwiLFxuICAgICAgbmFtZTogVFJBTlNGRVJfTU9ERV9NRVRBREFUQS5tb3ZlLmNvbW1hbmROYW1lLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB0aGlzLmhhbmRsZUFjdGl2ZUZpbGVDb21tYW5kKFwibW92ZVwiLCBjaGVja2luZyksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUFjdGl2ZUZpbGVDb21tYW5kKG1vZGU6IFRyYW5zZmVyTW9kZSwgY2hlY2tpbmc6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGNoZWNraW5nKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgW2FjdGl2ZUZpbGVdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJDb250ZXh0TWVudXMoKTogdm9pZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5hcHAud29ya3NwYWNlIGFzIGFueTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQod29ya3NwYWNlLm9uKFwiZmlsZS1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIFtmaWxlXSk7XG4gICAgfSkpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh3b3Jrc3BhY2Uub24oXCJmaWxlcy1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlczogVEFic3RyYWN0RmlsZVtdKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIGZpbGVzKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnRyeVJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JNZW51cygpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk7XG4gICAgfSkpO1xuXG4gICAgaWYgKCF0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICB0aGlzLm5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgdGhpcy50cnlSZWdpc3Rlck5vdGVib29rTmF2aWdhdG9yTWVudXMoKTtcbiAgICAgIH0sIDIwMDApO1xuICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vdGVib29rTmF2aWdhdG9yID0gKCh0aGlzLmFwcCBhcyB1bmtub3duIGFzIHsgcGx1Z2lucz86IHsgcGx1Z2lucz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0gfSkucGx1Z2lucz8ucGx1Z2lucz8uW1wibm90ZWJvb2stbmF2aWdhdG9yXCJdIGFzIHtcbiAgICAgIGFwaT86IHtcbiAgICAgICAgbWVudXM/OiB7XG4gICAgICAgICAgcmVnaXN0ZXJGaWxlTWVudT86IChjYWxsYmFjazogKGNvbnRleHQ6IGFueSkgPT4gdm9pZCkgPT4gKCgpID0+IHZvaWQpIHwgdm9pZDtcbiAgICAgICAgICByZWdpc3RlckZvbGRlck1lbnU/OiAoY2FsbGJhY2s6IChjb250ZXh0OiBhbnkpID0+IHZvaWQpID0+ICgoKSA9PiB2b2lkKSB8IHZvaWQ7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0gfCB1bmRlZmluZWQpPy5hcGk7XG5cbiAgICBpZiAoIW5vdGVib29rTmF2aWdhdG9yPy5tZW51cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2VGaWxlTWVudSA9IG5vdGVib29rTmF2aWdhdG9yLm1lbnVzLnJlZ2lzdGVyRmlsZU1lbnU/LigoY29udGV4dCkgPT4ge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uID0gQXJyYXkuaXNBcnJheShjb250ZXh0LnNlbGVjdGlvbj8uZmlsZXMpID8gY29udGV4dC5zZWxlY3Rpb24uZmlsZXMgOiBbY29udGV4dC5maWxlXTtcbiAgICAgIHRoaXMuYWRkVHJhbnNmZXJNZW51SXRlbXNUb0V4dGVybmFsTWVudShjb250ZXh0LmFkZEl0ZW0sIHNlbGVjdGlvbik7XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBkaXNwb3NlRmlsZU1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRmlsZU1lbnUpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2VGb2xkZXJNZW51ID0gbm90ZWJvb2tOYXZpZ2F0b3IubWVudXMucmVnaXN0ZXJGb2xkZXJNZW51Py4oKGNvbnRleHQpID0+IHtcbiAgICAgIHRoaXMuYWRkVHJhbnNmZXJNZW51SXRlbXNUb0V4dGVybmFsTWVudShjb250ZXh0LmFkZEl0ZW0sIFtjb250ZXh0LmZvbGRlcl0pO1xuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZGlzcG9zZUZvbGRlck1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRm9sZGVyTWVudSk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgICAgdGhpcy5ub3RlYm9va05hdmlnYXRvclJldHJ5SW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRUcmFuc2Zlck1lbnVJdGVtcyhtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLnBsYW5uZXIubm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbik7XG4gICAgaWYgKG5vcm1hbGl6ZWRTZWxlY3Rpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYWRkTW9kZU1lbnVJdGVtKG1lbnUsIG5vcm1hbGl6ZWRTZWxlY3Rpb24sIFwiY29weVwiKTtcbiAgICB0aGlzLmFkZE1vZGVNZW51SXRlbShtZW51LCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogdm9pZCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbGVjdGlvbiA9IHRoaXMucGxhbm5lci5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBpZiAobm9ybWFsaXplZFNlbGVjdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcImNvcHlcIik7XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZE1vZGVNZW51SXRlbShtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgbW9kZTogVHJhbnNmZXJNb2RlKTogdm9pZCB7XG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTW9kZU1lbnVJdGVtVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCBtb2RlOiBUcmFuc2Zlck1vZGUpOiB2b2lkIHtcbiAgICBhZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uZmlndXJlVHJhbnNmZXJNZW51SXRlbShpdGVtOiBNZW51SXRlbSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10sIG1vZGU6IFRyYW5zZmVyTW9kZSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gVFJBTlNGRVJfTU9ERV9NRVRBREFUQVttb2RlXTtcbiAgICBpdGVtLnNldFRpdGxlKG1ldGFkYXRhLm1lbnVUaXRsZSkuc2V0SWNvbihtZXRhZGF0YS5pY29uKTtcbiAgICBjb25zdCBzZWxlY3RhYmxlVGFyZ2V0cyA9IHRoaXMuZ2V0U2VsZWN0YWJsZVRhcmdldHMoKTtcbiAgICBpZiAoc2VsZWN0YWJsZVRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpdGVtLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlblRhcmdldE1vZGFsKG1vZGU6IFRyYW5zZmVyTW9kZSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5nZXRTZWxlY3RhYmxlVGFyZ2V0cygpO1xuICAgIGlmICh0YXJnZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShcIkFkZCBhIGRlc3RpbmF0aW9uIHZhdWx0IGZpcnN0LlwiLCA4MDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGl0bGUgPSBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBW21vZGVdLnRhcmdldE1vZGFsVGl0bGU7XG4gICAgbmV3IFRhcmdldFZhdWx0U3VnZ2VzdE1vZGFsKHRoaXMuYXBwLCB0YXJnZXRzLCB0aXRsZSwgKHRhcmdldCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnJ1blRyYW5zZmVyKG1vZGUsIHNlbGVjdGlvbiwgdGFyZ2V0KTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGFibGVUYXJnZXRzKCk6IERlc3RpbmF0aW9uQ29uZmlnW10ge1xuICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKCh0YXJnZXQpID0+IHRhcmdldC5uYW1lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuVHJhbnNmZXIobW9kZTogVHJhbnNmZXJNb2RlLCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwbGFuID0gYXdhaXQgdGhpcy5wbGFubmVyLnByZXBhcmUoc2VsZWN0aW9uLCB0YXJnZXQpO1xuICAgICAgY29uc3QgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMgPSBhd2FpdCB0aGlzLm1heWJlUmV2aWV3UGxhbihwbGFuKTtcbiAgICAgIGlmIChjb25maXJtZWRTZWxlY3Rpb25QYXRocyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCB0aGlzLmV4ZWN1dG9yLmV4ZWN1dGUocGxhbiwgbW9kZSwgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpO1xuICAgICAgdGhpcy5zaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGUsIHN1bW1hcnkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJDb3VsZG4ndCBjb21wbGV0ZSB0aGUgdHJhbnNmZXIuXCIsIDEyMDAwKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1heWJlUmV2aWV3UGxhbihwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbik6IFByb21pc2U8c3RyaW5nW10gfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiA9IHBsYW4uZXhwbGljaXRNYXJrZG93blBhdGhzLmxlbmd0aCA+IDA7XG4gICAgY29uc3QgaGFzUmVsZXZhbnRSZWxhdGlvbnNoaXBzID0gcGxhbi5yZXZpZXdSb290cy5zb21lKChyb290KSA9PiByb290LmNoaWxkcmVuLmxlbmd0aCA+IDApO1xuICAgIGlmICghaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiB8fCB0aGlzLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUgPT09IFwibmV2ZXJcIikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9PT0gXCJsaW5rZWQtb25seVwiICYmICFoYXNSZWxldmFudFJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5ldyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgcGxhbi5yZXZpZXdSb290cywgdGhpcy5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5KS53YWl0Rm9yUmVzdWx0KCk7XG4gICAgaWYgKCFyZXN1bHQuY29uZmlybWVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5zZWxlY3RlZFBhdGhzO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGU6IFRyYW5zZmVyTW9kZSwgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5KTogdm9pZCB7XG4gICAgY29uc3QgY29tcGxldGVkQ291bnQgPSBtb2RlID09PSBcImNvcHlcIiA/IHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgOiBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50O1xuICAgIGNvbnN0IGFjdGlvbiA9IG1vZGUgPT09IFwiY29weVwiID8gXCJDb3B5IGNvbXBsZXRlXCIgOiBcIk1vdmUgY29tcGxldGVcIjtcbiAgICBjb25zdCBwYXJ0cyA9IFtgJHtjb21wbGV0ZWRDb3VudH0gb2YgJHtzdW1tYXJ5LnJlcXVlc3RlZEZpbGVDb3VudH0gaXRlbXMgdHJhbnNmZXJyZWRgXTtcbiAgICBpZiAoc3VtbWFyeS5yZW5hbWVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkucmVuYW1lZENvdW50LCBcIml0ZW0gcmVuYW1lZFwiLCBcIml0ZW1zIHJlbmFtZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCwgXCJpdGVtIHNraXBwZWRcIiwgXCJpdGVtcyBza2lwcGVkXCIpKTtcbiAgICB9XG4gICAgaWYgKHN1bW1hcnkuZmFpbGVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkuZmFpbGVkQ291bnQsIFwiaXRlbSBmYWlsZWRcIiwgXCJpdGVtcyBmYWlsZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGggPiAwICYmIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgPT09IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGgsIFwid2FybmluZ1wiLCBcIndhcm5pbmdzXCIpKTtcbiAgICB9XG5cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSBcInRyYW5zLXZhdWx0LXNraXAtbm90aWNlXCI7XG4gICAgICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICB0aXRsZS5jbGFzc05hbWUgPSBcInRyYW5zLXZhdWx0LXNraXAtbm90aWNlLXRpdGxlXCI7XG4gICAgICB0aXRsZS50ZXh0Q29udGVudCA9IGAke2FjdGlvbn0gd2l0aCB3YXJuaW5nczogJHtwYXJ0cy5qb2luKFwiLCBcIil9LmA7XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGl0bGUpO1xuICAgICAgY29uc3Qgc2hvd25FbnRyaWVzID0gc3VtbWFyeS5za2lwcGVkRW50cmllcy5zbGljZSgwLCAxMCk7XG4gICAgICBjb25zdCBsaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInVsXCIpO1xuICAgICAgbGlzdC5jbGFzc05hbWUgPSBcInRyYW5zLXZhdWx0LXNraXAtbm90aWNlLWxpc3RcIjtcbiAgICAgIGZvciAoY29uc3Qgc2tpcHBlZCBvZiBzaG93bkVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgICAgICByb3cudGV4dENvbnRlbnQgPSBza2lwcGVkO1xuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICB9XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGlzdCk7XG4gICAgICBpZiAoc3VtbWFyeS5za2lwcGVkRW50cmllcy5sZW5ndGggPiBzaG93bkVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IG1vcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBtb3JlLmNsYXNzTmFtZSA9IFwidHJhbnMtdmF1bHQtc2tpcC1ub3RpY2UtbW9yZVwiO1xuICAgICAgICBtb3JlLnRleHRDb250ZW50ID0gYC4uLiBhbmQgJHtmb3JtYXRDb3VudChzdW1tYXJ5LnNraXBwZWRFbnRyaWVzLmxlbmd0aCAtIHNob3duRW50cmllcy5sZW5ndGgsIFwibW9yZSBza2lwcGVkIGl0ZW1cIiwgXCJtb3JlIHNraXBwZWQgaXRlbXNcIil9LmA7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChtb3JlKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpc21pc3NIaW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGRpc21pc3NIaW50LmNsYXNzTmFtZSA9IFwidHJhbnMtdmF1bHQtc2tpcC1ub3RpY2UtZGlzbWlzc1wiO1xuICAgICAgZGlzbWlzc0hpbnQudGV4dENvbnRlbnQgPSBcIkNsaWNrIHRvIGRpc21pc3NcIjtcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChkaXNtaXNzSGludCk7XG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgY29uc3Qgbm90aWNlID0gbmV3IE5vdGljZShmcmFnbWVudCwgMCkgYXMgTm90aWNlICYgeyBub3RpY2VFbD86IEhUTUxFbGVtZW50OyBoaWRlPzogKCkgPT4gdm9pZCB9O1xuICAgICAgbm90aWNlLm5vdGljZUVsPy5hZGRDbGFzcyhcInRyYW5zLXZhdWx0LW5vdGljZS1jbGlja2FibGVcIik7XG4gICAgICBub3RpY2Uubm90aWNlRWw/LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgIG5vdGljZS5oaWRlPy4oKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5ldyBOb3RpY2UoYCR7YWN0aW9ufTogJHtwYXJ0cy5qb2luKFwiLCBcIil9LmAsIDEwMDAwKTtcbiAgfVxufSJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFBZTtBQUNmLGdCQUFlO0FBQ2Ysa0JBQWlCO0FBQ2pCLHNCQXFCTztBQTJHUCxJQUFNLG1CQUF1QztBQUFBLEVBQzNDLGtCQUFrQjtBQUFBLEVBQ2xCLG9CQUFvQjtBQUFBLEVBQ3BCLGtCQUFrQjtBQUFBLEVBQ2xCLHVCQUF1QjtBQUFBLEVBQ3ZCLDZCQUE2QjtBQUFBLEVBQzdCLHNCQUFzQjtBQUFBLEVBQ3RCLFNBQVMsQ0FBQztBQUNaO0FB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
