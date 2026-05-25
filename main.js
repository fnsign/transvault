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

// RELEASENOTES.md
var RELEASENOTES_default = '# Trans Vault Release Notes\n\n## Version 1.1.0\n\n### Added\n\n- Release notes can now be viewed from the settings menu.\n\n### Changed\n\n- The detection of the default attachment path in the destination vault defaults now to "off". No user interaction is required, as previous settings will not be changed.\n\n\n';

// main.ts
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
    useDefaultAttachmentLocation: false,
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
    new import_obsidian.Setting(containerEl).setName("Release notes").setDesc("Read what changed in this version.").addButton((button) => {
      button.setButtonText("Show release notes").setCta().onClick(() => {
        new ReleaseNotesModal(this.app, this.plugin).open();
      });
    });
    containerEl.createEl("br");
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
var ReleaseNotesModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    this.titleEl.setText("Release notes");
    this.contentEl.empty();
    void import_obsidian.MarkdownRenderer.render(this.app, RELEASENOTES_default, this.contentEl, "RELEASENOTES.md", this.plugin);
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
      targets: (stored?.targets ?? []).map((target) => {
        const migratedTarget = {
          ...createBlankDestination(),
          ...target,
          id: target.id ?? createDestinationId()
        };
        if (typeof target.useDefaultAttachmentLocation !== "boolean" && !target.attachmentPath?.trim()) {
          migratedTarget.useDefaultAttachmentLocation = true;
        }
        return migratedTarget;
      })
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyIsICJSRUxFQVNFTk9URVMubWQiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCBvcyBmcm9tIFwib3NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQge1xuICBBcHAsXG4gIEZpbGVTeXN0ZW1BZGFwdGVyLFxuICBGdXp6eU1hdGNoLFxuICBGdXp6eVN1Z2dlc3RNb2RhbCxcbiAgTWVudSxcbiAgTWVudUl0ZW0sXG4gIE1hcmtkb3duUmVuZGVyZXIsXG4gIE1vZGFsLFxuICBOb3RpY2UsXG4gIFBsYXRmb3JtLFxuICBQbHVnaW4sXG4gIFBsdWdpblNldHRpbmdUYWIsXG4gIFNldHRpbmcsXG4gIFRBYnN0cmFjdEZpbGUsXG4gIFRGaWxlLFxuICBURm9sZGVyLFxuICBnZXRMaW5rcGF0aCxcbiAgbm9ybWFsaXplUGF0aCxcbiAgcGFyc2VZYW1sLFxuICBzZXRJY29uLFxuICBzdHJpbmdpZnlZYW1sLFxufSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCByZWxlYXNlTm90ZXMgZnJvbSBcIi4vUkVMRUFTRU5PVEVTLm1kXCI7XG5cbnR5cGUgVHJhbnNmZXJNb2RlID0gXCJjb3B5XCIgfCBcIm1vdmVcIjtcbnR5cGUgQ29uZmxpY3RTdHJhdGVneSA9IFwic2tpcFwiIHwgXCJhdXRvLXJlbmFtZVwiIHwgXCJvdmVyd3JpdGVcIjtcbnR5cGUgUmV2aWV3RGlyZWN0aW9uID0gXCJ0b1wiIHwgXCJmcm9tXCI7XG50eXBlIFJldmlld05vZGVUeXBlID0gXCJub3RlXCIgfCBcImdyb3VwXCIgfCBcImF0dGFjaG1lbnRcIjtcbnR5cGUgUmV2aWV3RGlhbG9nTW9kZSA9IFwiYWx3YXlzXCIgfCBcImxpbmtlZC1vbmx5XCIgfCBcIm5ldmVyXCI7XG5cbmludGVyZmFjZSBEZXN0aW5hdGlvbkNvbmZpZyB7XG4gIGlkOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgdmF1bHRQYXRoOiBzdHJpbmc7XG4gIGRlc3RpbmF0aW9uUGF0aDogc3RyaW5nO1xuICB1c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uOiBib29sZWFuO1xuICBhdHRhY2htZW50UGF0aDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVHJhbnNWYXVsdFNldHRpbmdzIHtcbiAgY29uZmxpY3RTdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneTtcbiAgaW5jbHVkZUxpbmtlZEZpbGVzOiBib29sZWFuO1xuICByZXZpZXdEaWFsb2dNb2RlOiBSZXZpZXdEaWFsb2dNb2RlO1xuICB0YWdzRm9yQ29waWVkRWxlbWVudHM6IHN0cmluZztcbiAgYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzOiBib29sZWFuO1xuICB0YWdzRm9yTW92ZWRFbGVtZW50czogc3RyaW5nO1xuICB0YXJnZXRzOiBEZXN0aW5hdGlvbkNvbmZpZ1tdO1xufVxuXG5pbnRlcmZhY2UgUmV2aWV3Tm9kZSB7XG4gIGlkOiBzdHJpbmc7XG4gIHR5cGU6IFJldmlld05vZGVUeXBlO1xuICBsYWJlbDogc3RyaW5nO1xuICBmaWxlUGF0aD86IHN0cmluZztcbiAgZGlyZWN0aW9uPzogUmV2aWV3RGlyZWN0aW9uO1xuICBjaGlsZHJlbjogUmV2aWV3Tm9kZVtdO1xufVxuXG5pbnRlcmZhY2UgRGlyZWN0RGVwZW5kZW5jaWVzIHtcbiAgbWFya2Rvd246IFNldDxzdHJpbmc+O1xuICBhdHRhY2htZW50czogU2V0PHN0cmluZz47XG59XG5cbmludGVyZmFjZSBEaXJlY3RSZWxhdGlvbnNoaXBzIGV4dGVuZHMgRGlyZWN0RGVwZW5kZW5jaWVzIHtcbiAgYmFja2xpbmtzOiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIEV4cGxpY2l0RmlsZVNlbGVjdGlvbiB7XG4gIGZpbGU6IFRGaWxlO1xuICBkZXN0aW5hdGlvblJlbGF0aXZlUGF0aDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUmVzb2x2ZWREZXN0aW5hdGlvbkNvbmZpZyBleHRlbmRzIERlc3RpbmF0aW9uQ29uZmlnIHtcbiAgdmF1bHRQYXRoOiBzdHJpbmc7XG4gIGRlc3RpbmF0aW9uUGF0aDogc3RyaW5nO1xuICBlZmZlY3RpdmVBdHRhY2htZW50UGF0aDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUHJlcGFyZWRUcmFuc2ZlclBsYW4ge1xuICBzb3VyY2VWYXVsdFJvb3Q6IHN0cmluZztcbiAgdGFyZ2V0OiBSZXNvbHZlZERlc3RpbmF0aW9uQ29uZmlnO1xuICBleHBsaWNpdEZpbGVzOiBFeHBsaWNpdEZpbGVTZWxlY3Rpb25bXTtcbiAgZXhwbGljaXRNYXJrZG93blBhdGhzOiBzdHJpbmdbXTtcbiAgc2VsZWN0ZWRGb2xkZXJQYXRoczogc3RyaW5nW107XG4gIHJldmlld1Jvb3RzOiBSZXZpZXdOb2RlW107XG4gIGRpcmVjdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgRGlyZWN0RGVwZW5kZW5jaWVzPjtcbiAgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+Pjtcbn1cblxuaW50ZXJmYWNlIERyYWZ0VHJhbnNmZXJFbnRyeSB7XG4gIHNvdXJjZUZpbGU6IFRGaWxlO1xuICBzb3VyY2VBYnNvbHV0ZVBhdGg6IHN0cmluZztcbiAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZztcbiAgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGg6IHN0cmluZztcbiAgZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nO1xuICBzaG91bGRSZXdyaXRlTGlua3M6IGJvb2xlYW47XG4gIGlzRXhwbGljaXRTZWxlY3Rpb246IGJvb2xlYW47XG4gIHdhc1JlbmFtZWQ6IGJvb2xlYW47XG4gIG92ZXJ3cml0ZUV4aXN0aW5nOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgRmluYWxpemVkVHJhbnNmZXJFbnRyeSBleHRlbmRzIERyYWZ0VHJhbnNmZXJFbnRyeSB7fVxuXG5pbnRlcmZhY2UgVHJhbnNmZXJTdW1tYXJ5IHtcbiAgcmVxdWVzdGVkRmlsZUNvdW50OiBudW1iZXI7XG4gIHRyYW5zZmVycmVkRmlsZUNvdW50OiBudW1iZXI7XG4gIG1vdmVkRmlsZUNvdW50OiBudW1iZXI7XG4gIHNraXBwZWRDb25mbGljdENvdW50OiBudW1iZXI7XG4gIHJlbmFtZWRDb3VudDogbnVtYmVyO1xuICBmYWlsZWRDb3VudDogbnVtYmVyO1xuICBza2lwcGVkRW50cmllczogc3RyaW5nW107XG4gIHdhcm5pbmdzOiBzdHJpbmdbXTtcbn1cblxuaW50ZXJmYWNlIFJldmlld01vZGFsUmVzdWx0IHtcbiAgY29uZmlybWVkOiBib29sZWFuO1xuICBzZWxlY3RlZFBhdGhzOiBzdHJpbmdbXTtcbn1cblxuaW50ZXJmYWNlIEZyb250bWF0dGVyVGFnUmVzdWx0IHtcbiAgY29udGVudDogc3RyaW5nO1xuICB3YXJuaW5nPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUGFyc2VkTWFya2Rvd25IcmVmIHtcbiAgcGF0aDogc3RyaW5nO1xuICB3cmFwcGVkSW5BbmdsZXM6IGJvb2xlYW47XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFRyYW5zVmF1bHRTZXR0aW5ncyA9IHtcbiAgY29uZmxpY3RTdHJhdGVneTogXCJza2lwXCIsXG4gIGluY2x1ZGVMaW5rZWRGaWxlczogdHJ1ZSxcbiAgcmV2aWV3RGlhbG9nTW9kZTogXCJhbHdheXNcIixcbiAgdGFnc0ZvckNvcGllZEVsZW1lbnRzOiBcIlwiLFxuICBhbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHM6IGZhbHNlLFxuICB0YWdzRm9yTW92ZWRFbGVtZW50czogXCJcIixcbiAgdGFyZ2V0czogW10sXG59O1xuXG5jb25zdCBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBOiBSZWNvcmQ8VHJhbnNmZXJNb2RlLCB7XG4gIG1lbnVUaXRsZTogc3RyaW5nO1xuICBjb21tYW5kTmFtZTogc3RyaW5nO1xuICB0YXJnZXRNb2RhbFRpdGxlOiBzdHJpbmc7XG4gIGljb246IHN0cmluZztcbn0+ID0ge1xuICBjb3B5OiB7XG4gICAgbWVudVRpdGxlOiBcIkNvcHkgdG8gdmF1bHQuLi5cIixcbiAgICBjb21tYW5kTmFtZTogXCJDb3B5IGFjdGl2ZSBmaWxlIHRvIHZhdWx0Li4uXCIsXG4gICAgdGFyZ2V0TW9kYWxUaXRsZTogXCJDaG9vc2UgYSB2YXVsdCB0byBjb3B5IHRvXCIsXG4gICAgaWNvbjogXCJjb3B5LXBsdXNcIixcbiAgfSxcbiAgbW92ZToge1xuICAgIG1lbnVUaXRsZTogXCJNb3ZlIHRvIHZhdWx0Li4uXCIsXG4gICAgY29tbWFuZE5hbWU6IFwiTW92ZSBhY3RpdmUgZmlsZSB0byB2YXVsdC4uLlwiLFxuICAgIHRhcmdldE1vZGFsVGl0bGU6IFwiQ2hvb3NlIGEgdmF1bHQgdG8gbW92ZSB0b1wiLFxuICAgIGljb246IFwiZm9sZGVyLXN5bWxpbmtcIixcbiAgfSxcbn07XG5cbmNvbnN0IENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBOiBSZWNvcmQ8Q29uZmxpY3RTdHJhdGVneSwge1xuICBsYWJlbDogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xufT4gPSB7XG4gIHNraXA6IHtcbiAgICBsYWJlbDogXCJTa2lwXCIsXG4gICAgZGVzY3JpcHRpb246IFwiRXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgd2lsbCBiZSBza2lwcGVkIGR1cmluZyB0cmFuc2Zlci5cIixcbiAgfSxcbiAgXCJhdXRvLXJlbmFtZVwiOiB7XG4gICAgbGFiZWw6IFwiQXV0by1yZW5hbWVcIixcbiAgICBkZXNjcmlwdGlvbjogXCJFeGlzdGluZyBkZXN0aW5hdGlvbiBmaWxlcyB3aWxsIGJlIGtlcHQsIGFuZCBuZXcgY29waWVzIHdpbGwgYmUgcmVuYW1lZCBhdXRvbWF0aWNhbGx5LlwiLFxuICB9LFxuICBvdmVyd3JpdGU6IHtcbiAgICBsYWJlbDogXCJPdmVyd3JpdGVcIixcbiAgICBkZXNjcmlwdGlvbjogXCJFeGlzdGluZyBkZXN0aW5hdGlvbiBmaWxlcyB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0cmFuc2Zlci5cIixcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZURlc3RpbmF0aW9uSWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBkZXN0aW5hdGlvbi0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgOCl9YDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQmxhbmtEZXN0aW5hdGlvbigpOiBEZXN0aW5hdGlvbkNvbmZpZyB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGNyZWF0ZURlc3RpbmF0aW9uSWQoKSxcbiAgICBuYW1lOiBcIlwiLFxuICAgIHZhdWx0UGF0aDogXCJcIixcbiAgICBkZXN0aW5hdGlvblBhdGg6IFwiXCIsXG4gICAgdXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbjogZmFsc2UsXG4gICAgYXR0YWNobWVudFBhdGg6IFwiXCIsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWROYW1lID0gdGFyZ2V0Lm5hbWUudHJpbSgpO1xuICBpZiAodHJpbW1lZE5hbWUubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiB0cmltbWVkTmFtZTtcbiAgfVxuICBjb25zdCB0cmltbWVkVmF1bHRQYXRoID0gdGFyZ2V0LnZhdWx0UGF0aC50cmltKCk7XG4gIGlmICh0cmltbWVkVmF1bHRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBcIlVubmFtZWQgZGVzdGluYXRpb25cIjtcbiAgfVxuICBjb25zdCBwYXJ0cyA9IHRyaW1tZWRWYXVsdFBhdGguc3BsaXQoL1svXFxcXF0rLykuZmlsdGVyKEJvb2xlYW4pO1xuICByZXR1cm4gcGFydHMuYXQoLTEpID8/IHRyaW1tZWRWYXVsdFBhdGg7XG59XG5cbmZ1bmN0aW9uIGdldENvbmZsaWN0U3RyYXRlZ3lMYWJlbChzdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSk6IHN0cmluZyB7XG4gIHJldHVybiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtzdHJhdGVneV0ubGFiZWw7XG59XG5cbmZ1bmN0aW9uIGdldENvbmZsaWN0U3RyYXRlZ3lEZXNjcmlwdGlvbihzdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSk6IHN0cmluZyB7XG4gIHJldHVybiBDT05GTElDVF9TVFJBVEVHWV9NRVRBREFUQVtzdHJhdGVneV0uZGVzY3JpcHRpb247XG59XG5cbmZ1bmN0aW9uIGZvcm1hdENvdW50KGNvdW50OiBudW1iZXIsIHNpbmd1bGFyOiBzdHJpbmcsIHBsdXJhbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2NvdW50fSAke2NvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWx9YDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5ub3JtYWxpemUocGF0aC5yZXNvbHZlKHZhbHVlKSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpO1xuICBpZiAoXG4gICAgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aCgnXCInKSAmJiBub3JtYWxpemVkLmVuZHNXaXRoKCdcIicpKVxuICAgIHx8IChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vcm1hbGl6ZWQuZW5kc1dpdGgoXCInXCIpKVxuICApIHtcbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5zbGljZSgxLCAtMSkudHJpbSgpO1xuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcIndpbjMyXCIpIHtcbiAgICBpZiAobm9ybWFsaXplZCA9PT0gXCJ+XCIpIHtcbiAgICAgIG5vcm1hbGl6ZWQgPSBvcy5ob21lZGlyKCk7XG4gICAgfSBlbHNlIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCJ+L1wiKSkge1xuICAgICAgbm9ybWFsaXplZCA9IHBhdGguam9pbihvcy5ob21lZGlyKCksIG5vcm1hbGl6ZWQuc2xpY2UoMikpO1xuICAgIH0gZWxzZSBpZiAobm9ybWFsaXplZC5zdGFydHNXaXRoKFwiJEhPTUUvXCIpKSB7XG4gICAgICBub3JtYWxpemVkID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgbm9ybWFsaXplZC5zbGljZShcIiRIT01FL1wiLmxlbmd0aCkpO1xuICAgIH1cbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5yZXBsYWNlKC9cXFxcKFsgISMkJicoKSo7PD4/QFtcXF1eYHt8fX5dKS9nLCBcIiQxXCIpO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVBYnNvbHV0ZVBhdGgodmFsdWU6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWQgPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHZhbHVlKTtcbiAgaWYgKHRyaW1tZWQubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBpcyByZXF1aXJlZC5gKTtcbiAgfVxuICBpZiAoIXBhdGguaXNBYnNvbHV0ZSh0cmltbWVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbXVzdCBiZSBhbiBhYnNvbHV0ZSBwYXRoLmApO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVBYnNvbHV0ZVBhdGgodHJpbW1lZCk7XG59XG5cbmZ1bmN0aW9uIHRvVmF1bHRSZWxhdGl2ZVBhdGgodmF1bHRSb290OiBzdHJpbmcsIGFic29sdXRlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5vcm1hbGl6ZVBhdGgocGF0aC5yZWxhdGl2ZSh2YXVsdFJvb3QsIGFic29sdXRlUGF0aCkuc3BsaXQocGF0aC5zZXApLmpvaW4oXCIvXCIpKTtcbn1cblxuZnVuY3Rpb24gY2xlYW5UYWdJbnB1dCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoXCIsXCIpXG4gICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAuZmlsdGVyKChlbnRyeSwgaW5kZXgsIGl0ZW1zKSA9PiBlbnRyeS5sZW5ndGggPiAwICYmIGl0ZW1zLmluZGV4T2YoZW50cnkpID09PSBpbmRleCk7XG59XG5cbmZ1bmN0aW9uIGpvaW5UYWdWYWx1ZXMoZXhpc3Rpbmc6IHN0cmluZ1tdLCBhZGRpdGlvbnM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICBjb25zdCBub3JtYWxpemVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgdGFnIG9mIFsuLi5leGlzdGluZywgLi4uYWRkaXRpb25zXSkge1xuICAgIGNvbnN0IGNsZWFuID0gdGFnLnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKTtcbiAgICBpZiAoY2xlYW4ubGVuZ3RoID4gMCkge1xuICAgICAgbm9ybWFsaXplZC5hZGQoY2xlYW4pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gWy4uLm5vcm1hbGl6ZWRdO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0RnJvbnRtYXR0ZXJSYW5nZShjb250ZW50OiBzdHJpbmcpOiB7IHJhbmdlOiBbbnVtYmVyLCBudW1iZXJdOyBib2R5OiBzdHJpbmcgfSB8IG51bGwgfCBcImludmFsaWRcIiB7XG4gIGlmICghY29udGVudC5zdGFydHNXaXRoKFwiLS0tXFxuXCIpICYmICFjb250ZW50LnN0YXJ0c1dpdGgoXCItLS1cXHJcXG5cIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBtYXRjaGVyID0gL14tLS1cXHI/XFxuKFtcXHNcXFNdKj8pXFxyP1xcbi0tLVxccj9cXG4/LztcbiAgY29uc3QgbWF0Y2ggPSBjb250ZW50Lm1hdGNoKG1hdGNoZXIpO1xuICBpZiAoIW1hdGNoIHx8IG1hdGNoLmluZGV4ICE9PSAwKSB7XG4gICAgcmV0dXJuIFwiaW52YWxpZFwiO1xuICB9XG4gIHJldHVybiB7XG4gICAgcmFuZ2U6IFswLCBtYXRjaFswXS5sZW5ndGhdLFxuICAgIGJvZHk6IG1hdGNoWzFdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJCb2R5OiBzdHJpbmcpOiBcImFycmF5XCIgfCBcImNvbW1hXCIgfCBcInNwYWNlXCIgfCBcInN0cmluZ1wiIHwgXCJ1bmtub3duXCIge1xuICBjb25zdCB0YWdzTGluZSA9IGZyb250bWF0dGVyQm9keS5tYXRjaCgvXnRhZ3M6XFxzKiguKykkL20pO1xuICBpZiAoIXRhZ3NMaW5lKSB7XG4gICAgaWYgKC9edGFnczpcXHMqJC9tLnRlc3QoZnJvbnRtYXR0ZXJCb2R5KSB8fCAvXnRhZ3M6XFxzKlxccj9cXG4vbS50ZXN0KGZyb250bWF0dGVyQm9keSkpIHtcbiAgICAgIHJldHVybiBcImFycmF5XCI7XG4gICAgfVxuICAgIHJldHVybiBcInVua25vd25cIjtcbiAgfVxuICBjb25zdCB2YWx1ZSA9IHRhZ3NMaW5lWzFdLnRyaW0oKTtcbiAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoXCJbXCIpKSB7XG4gICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgfVxuICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpKSB7XG4gICAgcmV0dXJuIFwiY29tbWFcIjtcbiAgfVxuICBpZiAoL1xccy8udGVzdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gXCJzcGFjZVwiO1xuICB9XG4gIHJldHVybiBcInN0cmluZ1wiO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0RXhpc3RpbmdUYWdzKHZhbHVlOiB1bmtub3duKTogc3RyaW5nW10ge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgIC5tYXAoKGVudHJ5KSA9PiAodHlwZW9mIGVudHJ5ID09PSBcInN0cmluZ1wiID8gZW50cnkgOiBTdHJpbmcoZW50cnkgPz8gXCJcIikpKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3Qgc2VwYXJhdG9yID0gdmFsdWUuaW5jbHVkZXMoXCIsXCIpID8gXCIsXCIgOiAvXFxzKy87XG4gICAgcmV0dXJuIHZhbHVlXG4gICAgICAuc3BsaXQoc2VwYXJhdG9yKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRyaW0oKS5yZXBsYWNlKC9eIysvLCBcIlwiKSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKTtcbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIGlzTWFya2Rvd25GaWxlKGZpbGU6IFRGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpID09PSBcIm1kXCI7XG59XG5cbmZ1bmN0aW9uIGhhc1NlbGVjdGVkQW5jZXN0b3IoZmlsZVBhdGg6IHN0cmluZywgc2VsZWN0ZWRQYXRoczogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoKS5zcGxpdChcIi9cIik7XG4gIGZvciAobGV0IGluZGV4ID0gMTsgaW5kZXggPCBwYXJ0cy5sZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBpZiAoc2VsZWN0ZWRQYXRocy5oYXMocGFydHMuc2xpY2UoMCwgaW5kZXgpLmpvaW4oXCIvXCIpKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuY2xhc3MgRGVzdGluYXRpb25SZXNvbHZlciB7XG4gIGFzeW5jIHJlc29sdmUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8UmVzb2x2ZWREZXN0aW5hdGlvbkNvbmZpZz4ge1xuICAgIGNvbnN0IHZhdWx0UGF0aCA9IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQudmF1bHRQYXRoLCBcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGhcIik7XG4gICAgY29uc3QgZGVzdGluYXRpb25QYXRoID0gZW5zdXJlQWJzb2x1dGVQYXRoKHRhcmdldC5kZXN0aW5hdGlvblBhdGgsIFwiRGVzdGluYXRpb24gcGF0aFwiKTtcbiAgICBjb25zdCBlZmZlY3RpdmVBdHRhY2htZW50UGF0aCA9IHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uXG4gICAgICA/IGF3YWl0IHRoaXMucmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aCh2YXVsdFBhdGgpXG4gICAgICA6IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQuYXR0YWNobWVudFBhdGgsIFwiQXR0YWNobWVudCBwYXRoXCIpO1xuXG4gICAgYXdhaXQgdGhpcy5hc3NlcnREaXJlY3RvcnlFeGlzdHModmF1bHRQYXRoLCBcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGhcIik7XG4gICAgdGhpcy5hc3NlcnRJbnNpZGVWYXVsdCh2YXVsdFBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgXCJEZXN0aW5hdGlvbiBwYXRoXCIpO1xuICAgIHRoaXMuYXNzZXJ0SW5zaWRlVmF1bHQodmF1bHRQYXRoLCBlZmZlY3RpdmVBdHRhY2htZW50UGF0aCwgXCJBdHRhY2htZW50IHBhdGhcIik7XG4gICAgYXdhaXQgZnMubWtkaXIoZGVzdGluYXRpb25QYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCBmcy5ta2RpcihlZmZlY3RpdmVBdHRhY2htZW50UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4udGFyZ2V0LFxuICAgICAgdmF1bHRQYXRoLFxuICAgICAgZGVzdGluYXRpb25QYXRoLFxuICAgICAgZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsXG4gICAgICBhdHRhY2htZW50UGF0aDogdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLnRyaW0oKSxcbiAgICB9O1xuICB9XG5cbiAgdmFsaWRhdGUodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdHJpbW1lZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LnZhdWx0UGF0aCk7XG4gICAgY29uc3QgdHJpbW1lZERlc3RpbmF0aW9uUGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCk7XG4gICAgY29uc3QgdHJpbW1lZEF0dGFjaG1lbnRQYXRoID0gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh0YXJnZXQuYXR0YWNobWVudFBhdGgpO1xuXG4gICAgaWYgKHRyaW1tZWRWYXVsdFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGggaXMgcmVxdWlyZWQuXCIpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoIG11c3QgYmUgYWJzb2x1dGUuXCIpO1xuICAgIH1cblxuICAgIGlmICh0cmltbWVkRGVzdGluYXRpb25QYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiBwYXRoIGlzIHJlcXVpcmVkLlwiKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZERlc3RpbmF0aW9uUGF0aCkpIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICB9IGVsc2UgaWYgKHBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSAmJiAhdGhpcy5pc0luc2lkZVZhdWx0KHRyaW1tZWRWYXVsdFBhdGgsIHRyaW1tZWREZXN0aW5hdGlvblBhdGgpKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHBhdGggbXVzdCBiZSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LlwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uKSB7XG4gICAgICBpZiAodHJpbW1lZEF0dGFjaG1lbnRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBlcnJvcnMucHVzaChcIkF0dGFjaG1lbnQgcGF0aCBpcyByZXF1aXJlZCB3aGVuIGF1dG9tYXRpYyBhdHRhY2htZW50IGRldGVjdGlvbiBpcyBkaXNhYmxlZC5cIik7XG4gICAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZEF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICBlcnJvcnMucHVzaChcIkF0dGFjaG1lbnQgcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICAgIH0gZWxzZSBpZiAocGF0aC5pc0Fic29sdXRlKHRyaW1tZWRWYXVsdFBhdGgpICYmICF0aGlzLmlzSW5zaWRlVmF1bHQodHJpbW1lZFZhdWx0UGF0aCwgdHJpbW1lZEF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICBlcnJvcnMucHVzaChcIkF0dGFjaG1lbnQgcGF0aCBtdXN0IGJlIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQuXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBlcnJvcnM7XG4gIH1cblxuICBhc3luYyByZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBub3JtYWxpemVkVmF1bHRQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhdWx0UGF0aCk7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IHBhdGguam9pbihub3JtYWxpemVkVmF1bHRQYXRoLCBcIi5vYnNpZGlhblwiLCBcImFwcC5qc29uXCIpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByYXcgPSBhd2FpdCBmcy5yZWFkRmlsZShjb25maWdQYXRoLCBcInV0ZjhcIik7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdykgYXMgeyBhdHRhY2htZW50Rm9sZGVyUGF0aD86IHN0cmluZyB9O1xuICAgICAgY29uc3QgYXR0YWNobWVudEZvbGRlclBhdGggPSBwYXJzZWQuYXR0YWNobWVudEZvbGRlclBhdGg/LnRyaW0oKTtcbiAgICAgIGlmICghYXR0YWNobWVudEZvbGRlclBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRWYXVsdFBhdGg7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvbHZlZCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChwYXRoLnJlc29sdmUobm9ybWFsaXplZFZhdWx0UGF0aCwgYXR0YWNobWVudEZvbGRlclBhdGgpKTtcbiAgICAgIGlmICghdGhpcy5pc0luc2lkZVZhdWx0KG5vcm1hbGl6ZWRWYXVsdFBhdGgsIHJlc29sdmVkKSkge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplZFZhdWx0UGF0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBub3JtYWxpemVkVmF1bHRQYXRoO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgYXNzZXJ0RGlyZWN0b3J5RXhpc3RzKGRpcmVjdG9yeVBhdGg6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMuc3RhdChkaXJlY3RvcnlQYXRoKTtcbiAgICAgIGlmICghc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbXVzdCBwb2ludCB0byBhIGRpcmVjdG9yeS5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gXCJFTk9FTlRcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IGRvZXMgbm90IGV4aXN0LmApO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3NlcnRJbnNpZGVWYXVsdCh2YXVsdFBhdGg6IHN0cmluZywgY2FuZGlkYXRlUGF0aDogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmlzSW5zaWRlVmF1bHQodmF1bHRQYXRoLCBjYW5kaWRhdGVQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IGJlIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpc0luc2lkZVZhdWx0KHZhdWx0UGF0aDogc3RyaW5nLCBjYW5kaWRhdGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCByZWxhdGl2ZSA9IHBhdGgucmVsYXRpdmUobm9ybWFsaXplQWJzb2x1dGVQYXRoKHZhdWx0UGF0aCksIG5vcm1hbGl6ZUFic29sdXRlUGF0aChjYW5kaWRhdGVQYXRoKSk7XG4gICAgcmV0dXJuICEocmVsYXRpdmUuc3RhcnRzV2l0aChcIi4uXCIpIHx8IHBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZSkpO1xuICB9XG59XG5cbmNsYXNzIFRyYW5zZmVyUGxhbm5lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBUcmFuc1ZhdWx0UGx1Z2luLCBwcml2YXRlIHJlYWRvbmx5IGRlc3RpbmF0aW9uUmVzb2x2ZXI6IERlc3RpbmF0aW9uUmVzb2x2ZXIpIHt9XG5cbiAgYXN5bmMgcHJlcGFyZShzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8UHJlcGFyZWRUcmFuc2ZlclBsYW4+IHtcbiAgICBjb25zdCBzb3VyY2VWYXVsdFJvb3QgPSB0aGlzLmdldFNvdXJjZVZhdWx0Um9vdCgpO1xuICAgIGNvbnN0IHJlc29sdmVkVGFyZ2V0ID0gYXdhaXQgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyLnJlc29sdmUodGFyZ2V0KTtcbiAgICBjb25zdCBub3JtYWxpemVkU2VsZWN0aW9uID0gdGhpcy5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBjb25zdCBleHBsaWNpdEZpbGVzID0gdGhpcy5jb2xsZWN0RXhwbGljaXRGaWxlcyhub3JtYWxpemVkU2VsZWN0aW9uKTtcblxuICAgIGlmIChleHBsaWNpdEZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHNlbGVjdGlvbiBkb2VzIG5vdCBjb250YWluIGFueSBmaWxlcyB0byB0cmFuc2Zlci5cIik7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwbGljaXRNYXJrZG93bkZpbGVzID0gZXhwbGljaXRGaWxlcy5tYXAoKGVudHJ5KSA9PiBlbnRyeS5maWxlKS5maWx0ZXIoaXNNYXJrZG93bkZpbGUpO1xuICAgIGNvbnN0IHJldmlld1Jvb3RzOiBSZXZpZXdOb2RlW10gPSBbXTtcbiAgICBjb25zdCBkaXJlY3REZXBlbmRlbmNpZXMgPSBuZXcgTWFwPHN0cmluZywgRGlyZWN0RGVwZW5kZW5jaWVzPigpO1xuICAgIGNvbnN0IGRpcmVjdE1hcmtkb3duUmVsYXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBEaXJlY3RSZWxhdGlvbnNoaXBzPigpO1xuXG4gICAgY29uc3QgZ2V0UmVsYXRpb25zaGlwcyA9IChmaWxlOiBURmlsZSk6IERpcmVjdFJlbGF0aW9uc2hpcHMgPT4ge1xuICAgICAgY29uc3QgY2FjaGVkID0gcmVsYXRpb25zaGlwc0NhY2hlLmdldChmaWxlLnBhdGgpO1xuICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICByZXR1cm4gY2FjaGVkO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IHRoaXMuY29sbGVjdERpcmVjdFJlbGF0aW9uc2hpcHMoZmlsZSk7XG4gICAgICByZWxhdGlvbnNoaXBzQ2FjaGUuc2V0KGZpbGUucGF0aCwgcmVsYXRpb25zaGlwcyk7XG4gICAgICBkaXJlY3REZXBlbmRlbmNpZXMuc2V0KGZpbGUucGF0aCwge1xuICAgICAgICBtYXJrZG93bjogcmVsYXRpb25zaGlwcy5tYXJrZG93bixcbiAgICAgICAgYXR0YWNobWVudHM6IHJlbGF0aW9uc2hpcHMuYXR0YWNobWVudHMsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZWxhdGlvbnNoaXBzO1xuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZXhwbGljaXRNYXJrZG93bkZpbGVzKSB7XG4gICAgICBjb25zdCByZWxhdGlvbnNoaXBzID0gZ2V0UmVsYXRpb25zaGlwcyhmaWxlKTtcbiAgICAgIGRpcmVjdE1hcmtkb3duUmVsYXRpb25zLnNldChmaWxlLnBhdGgsIG5ldyBTZXQ8c3RyaW5nPihbXG4gICAgICAgIC4uLnJlbGF0aW9uc2hpcHMubWFya2Rvd24sXG4gICAgICAgIC4uLnJlbGF0aW9uc2hpcHMuYmFja2xpbmtzLFxuICAgICAgXSkpO1xuXG4gICAgICBjb25zdCBncm91cHM6IFJldmlld05vZGVbXSA9IHRoaXMuY3JlYXRlQXR0YWNobWVudEdyb3VwKGZpbGUucGF0aCwgZmlsZS5wYXRoLCBnZXRSZWxhdGlvbnNoaXBzKTtcbiAgICAgIGlmIChyZWxhdGlvbnNoaXBzLm1hcmtkb3duLnNpemUgPiAwKSB7XG4gICAgICAgIGdyb3Vwcy5wdXNoKHtcbiAgICAgICAgICBpZDogYCR7ZmlsZS5wYXRofTo6dG8tZ3JvdXBgLFxuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICBsYWJlbDogXCJsaW5rcyB0b1wiLFxuICAgICAgICAgIGRpcmVjdGlvbjogXCJ0b1wiLFxuICAgICAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5tYXJrZG93bl1cbiAgICAgICAgICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gbGVmdC5sb2NhbGVDb21wYXJlKHJpZ2h0KSlcbiAgICAgICAgICAgIC5tYXAoKG5vdGVQYXRoKSA9PiB0aGlzLmNyZWF0ZU5vdGVOb2RlKGZpbGUucGF0aCwgXCJ0b1wiLCBub3RlUGF0aCwgZ2V0UmVsYXRpb25zaGlwcykpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZWxhdGlvbnNoaXBzLmJhY2tsaW5rcy5zaXplID4gMCkge1xuICAgICAgICBncm91cHMucHVzaCh7XG4gICAgICAgICAgaWQ6IGAke2ZpbGUucGF0aH06OmZyb20tZ3JvdXBgLFxuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICBsYWJlbDogXCJsaW5rcyBmcm9tXCIsXG4gICAgICAgICAgZGlyZWN0aW9uOiBcImZyb21cIixcbiAgICAgICAgICBjaGlsZHJlbjogWy4uLnJlbGF0aW9uc2hpcHMuYmFja2xpbmtzXVxuICAgICAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAgICAgLm1hcCgobm90ZVBhdGgpID0+IHRoaXMuY3JlYXRlTm90ZU5vZGUoZmlsZS5wYXRoLCBcImZyb21cIiwgbm90ZVBhdGgsIGdldFJlbGF0aW9uc2hpcHMpKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXZpZXdSb290cy5wdXNoKHtcbiAgICAgICAgaWQ6IGAke2ZpbGUucGF0aH06OnJvb3RgLFxuICAgICAgICB0eXBlOiBcIm5vdGVcIixcbiAgICAgICAgbGFiZWw6IGZpbGUuYmFzZW5hbWUsXG4gICAgICAgIGZpbGVQYXRoOiBmaWxlLnBhdGgsXG4gICAgICAgIGNoaWxkcmVuOiBncm91cHMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlVmF1bHRSb290LFxuICAgICAgdGFyZ2V0OiByZXNvbHZlZFRhcmdldCxcbiAgICAgIGV4cGxpY2l0RmlsZXMsXG4gICAgICBleHBsaWNpdE1hcmtkb3duUGF0aHM6IGV4cGxpY2l0TWFya2Rvd25GaWxlcy5tYXAoKGZpbGUpID0+IGZpbGUucGF0aCksXG4gICAgICBzZWxlY3RlZEZvbGRlclBhdGhzOiBub3JtYWxpemVkU2VsZWN0aW9uLmZpbHRlcigoZW50cnkpOiBlbnRyeSBpcyBURm9sZGVyID0+IGVudHJ5IGluc3RhbmNlb2YgVEZvbGRlcikubWFwKChmb2xkZXIpID0+IGZvbGRlci5wYXRoKSxcbiAgICAgIHJldmlld1Jvb3RzLFxuICAgICAgZGlyZWN0RGVwZW5kZW5jaWVzLFxuICAgICAgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnMsXG4gICAgfTtcbiAgfVxuXG4gIG5vcm1hbGl6ZVNlbGVjdGlvbihzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IFRBYnN0cmFjdEZpbGVbXSB7XG4gICAgY29uc3QgdW5pcXVlID0gbmV3IE1hcDxzdHJpbmcsIFRBYnN0cmFjdEZpbGU+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBzZWxlY3Rpb24pIHtcbiAgICAgIHVuaXF1ZS5zZXQobm9ybWFsaXplUGF0aChlbnRyeS5wYXRoKSwgZW50cnkpO1xuICAgIH1cbiAgICBjb25zdCBzZWxlY3RlZFBhdGhzID0gbmV3IFNldCh1bmlxdWUua2V5cygpKTtcbiAgICByZXR1cm4gWy4uLnVuaXF1ZS52YWx1ZXMoKV0uZmlsdGVyKChlbnRyeSkgPT4gIWhhc1NlbGVjdGVkQW5jZXN0b3IoZW50cnkucGF0aCwgc2VsZWN0ZWRQYXRocykpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTb3VyY2VWYXVsdFJvb3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCEoYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHJhbnMgVmF1bHQgcmVxdWlyZXMgYSBkZXNrdG9wIGZpbGUgc3lzdGVtIGFkYXB0ZXIuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbm9ybWFsaXplQWJzb2x1dGVQYXRoKGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKSk7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RFeHBsaWNpdEZpbGVzKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10ge1xuICAgIGNvbnN0IGV4cGxpY2l0RmlsZXM6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdID0gW107XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBzZWxlY3Rpb24pIHtcbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGV4cGxpY2l0RmlsZXMucHVzaCh7XG4gICAgICAgICAgZmlsZTogZW50cnksXG4gICAgICAgICAgZGVzdGluYXRpb25SZWxhdGl2ZVBhdGg6IHBhdGgucG9zaXguYmFzZW5hbWUobm9ybWFsaXplUGF0aChlbnRyeS5wYXRoKSksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0Rm9sZGVyRmlsZXMoZW50cnksIGVudHJ5LCBleHBsaWNpdEZpbGVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGV4cGxpY2l0RmlsZXM7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RGb2xkZXJGaWxlcyhmb2xkZXI6IFRGb2xkZXIsIHJvb3RGb2xkZXI6IFRGb2xkZXIsIHNpbms6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlSW5zaWRlUm9vdCA9IHBhdGgucG9zaXgucmVsYXRpdmUobm9ybWFsaXplUGF0aChyb290Rm9sZGVyLnBhdGgpLCBub3JtYWxpemVQYXRoKGNoaWxkLnBhdGgpKTtcbiAgICAgICAgc2luay5wdXNoKHtcbiAgICAgICAgICBmaWxlOiBjaGlsZCxcbiAgICAgICAgICBkZXN0aW5hdGlvblJlbGF0aXZlUGF0aDogbm9ybWFsaXplUGF0aChwYXRoLnBvc2l4LmpvaW4ocm9vdEZvbGRlci5uYW1lLCByZWxhdGl2ZUluc2lkZVJvb3QpKSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGNoaWxkIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICB0aGlzLmNvbGxlY3RGb2xkZXJGaWxlcyhjaGlsZCwgcm9vdEZvbGRlciwgc2luayk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVOb3RlTm9kZShcbiAgICByb290UGF0aDogc3RyaW5nLFxuICAgIGRpcmVjdGlvbjogUmV2aWV3RGlyZWN0aW9uLFxuICAgIG5vdGVQYXRoOiBzdHJpbmcsXG4gICAgZ2V0UmVsYXRpb25zaGlwczogKGZpbGU6IFRGaWxlKSA9PiBEaXJlY3RSZWxhdGlvbnNoaXBzLFxuICApOiBSZXZpZXdOb2RlIHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobm90ZVBhdGgpO1xuICAgIGNvbnN0IGNoaWxkcmVuID0gZmlsZSAmJiBpc01hcmtkb3duRmlsZShmaWxlKVxuICAgICAgPyB0aGlzLmNyZWF0ZUF0dGFjaG1lbnRHcm91cChgJHtyb290UGF0aH06OiR7ZGlyZWN0aW9ufTo6JHtub3RlUGF0aH1gLCBmaWxlLnBhdGgsIGdldFJlbGF0aW9uc2hpcHMpXG4gICAgICA6IFtdO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogYCR7cm9vdFBhdGh9Ojoke2RpcmVjdGlvbn06OiR7bm90ZVBhdGh9YCxcbiAgICAgIHR5cGU6IFwibm90ZVwiLFxuICAgICAgbGFiZWw6IGZpbGU/LmJhc2VuYW1lID8/IHBhdGgucG9zaXguYmFzZW5hbWUobm90ZVBhdGgsIFwiLm1kXCIpLFxuICAgICAgZmlsZVBhdGg6IG5vdGVQYXRoLFxuICAgICAgY2hpbGRyZW4sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXR0YWNobWVudEdyb3VwKFxuICAgIGJyYW5jaElkOiBzdHJpbmcsXG4gICAgbm90ZVBhdGg6IHN0cmluZyxcbiAgICBnZXRSZWxhdGlvbnNoaXBzOiAoZmlsZTogVEZpbGUpID0+IERpcmVjdFJlbGF0aW9uc2hpcHMsXG4gICk6IFJldmlld05vZGVbXSB7XG4gICAgY29uc3Qgbm90ZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChub3RlUGF0aCk7XG4gICAgaWYgKCFub3RlRmlsZSB8fCAhaXNNYXJrZG93bkZpbGUobm90ZUZpbGUpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBnZXRSZWxhdGlvbnNoaXBzKG5vdGVGaWxlKTtcbiAgICBpZiAocmVsYXRpb25zaGlwcy5hdHRhY2htZW50cy5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBbe1xuICAgICAgaWQ6IGAke2JyYW5jaElkfTo6YXR0YWNobWVudHMtZ3JvdXBgLFxuICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgbGFiZWw6IFwiYXR0YWNobWVudHNcIixcbiAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5hdHRhY2htZW50c11cbiAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAubWFwKChhdHRhY2htZW50UGF0aCkgPT4gdGhpcy5jcmVhdGVBdHRhY2htZW50Tm9kZShicmFuY2hJZCwgYXR0YWNobWVudFBhdGgpKSxcbiAgICB9XTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXR0YWNobWVudE5vZGUoYnJhbmNoSWQ6IHN0cmluZywgYXR0YWNobWVudFBhdGg6IHN0cmluZyk6IFJldmlld05vZGUge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChhdHRhY2htZW50UGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBgJHticmFuY2hJZH06OmF0dGFjaG1lbnQ6OiR7YXR0YWNobWVudFBhdGh9YCxcbiAgICAgIHR5cGU6IFwiYXR0YWNobWVudFwiLFxuICAgICAgbGFiZWw6IGZpbGU/Lm5hbWUgPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShhdHRhY2htZW50UGF0aCksXG4gICAgICBmaWxlUGF0aDogYXR0YWNobWVudFBhdGgsXG4gICAgICBjaGlsZHJlbjogW10sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdERpcmVjdFJlbGF0aW9uc2hpcHMoZmlsZTogVEZpbGUpOiBEaXJlY3RSZWxhdGlvbnNoaXBzIHtcbiAgICBjb25zdCBtYXJrZG93biA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGF0dGFjaG1lbnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgZm9yIChjb25zdCByZWYgb2YgWy4uLihjYWNoZT8ubGlua3MgPz8gW10pLCAuLi4oY2FjaGU/LmVtYmVkcyA/PyBbXSksIC4uLihjYWNoZT8uZnJvbnRtYXR0ZXJMaW5rcyA/PyBbXSldKSB7XG4gICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGdldExpbmtwYXRoKHJlZi5saW5rKSwgZmlsZS5wYXRoKTtcbiAgICAgIGlmICghKGRlc3RpbmF0aW9uIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGlzTWFya2Rvd25GaWxlKGRlc3RpbmF0aW9uKSkge1xuICAgICAgICBtYXJrZG93bi5hZGQoZGVzdGluYXRpb24ucGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRhY2htZW50cy5hZGQoZGVzdGluYXRpb24ucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYmFja2xpbmtzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcmVzb2x2ZWRMaW5rcyA9ICh0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZSBhcyB1bmtub3duIGFzIHtcbiAgICAgIHJlc29sdmVkTGlua3M/OiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PjtcbiAgICB9KS5yZXNvbHZlZExpbmtzID8/IHt9O1xuICAgIGZvciAoY29uc3QgW3NvdXJjZVBhdGgsIHRhcmdldHNdIG9mIE9iamVjdC5lbnRyaWVzKHJlc29sdmVkTGlua3MpKSB7XG4gICAgICBpZiAoIXRhcmdldHNbZmlsZS5wYXRoXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChzb3VyY2VQYXRoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlICYmIGlzTWFya2Rvd25GaWxlKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGJhY2tsaW5rcy5hZGQoc291cmNlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1hcmtkb3duLFxuICAgICAgYmFja2xpbmtzLFxuICAgICAgYXR0YWNobWVudHMsXG4gICAgfTtcbiAgfVxufVxuXG5jbGFzcyBUcmFuc2ZlckV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4pIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbiwgbW9kZTogVHJhbnNmZXJNb2RlLCBjb25maXJtZWRTZWxlY3Rpb25QYXRocz86IHN0cmluZ1tdKTogUHJvbWlzZTxUcmFuc2ZlclN1bW1hcnk+IHtcbiAgICBjb25zdCBzZWxlY3RlZFJldmlld1BhdGhzID0gY29uZmlybWVkU2VsZWN0aW9uUGF0aHNcbiAgICAgID8gbmV3IFNldDxzdHJpbmc+KGNvbmZpcm1lZFNlbGVjdGlvblBhdGhzKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gICAgY29uc3Qgc2VsZWN0ZWRNYXJrZG93blBhdGhzID0gc2VsZWN0ZWRSZXZpZXdQYXRoc1xuICAgICAgPyBuZXcgU2V0PHN0cmluZz4oWy4uLnNlbGVjdGVkUmV2aWV3UGF0aHNdLmZpbHRlcigoZW50cnkpID0+IHRoaXMuaXNTZWxlY3RlZE1hcmtkb3duUGF0aChlbnRyeSkpKVxuICAgICAgOiBuZXcgU2V0PHN0cmluZz4ocGxhbi5leHBsaWNpdE1hcmtkb3duUGF0aHMpO1xuXG4gICAgY29uc3QgZHJhZnRFbnRyaWVzID0gbmV3IE1hcDxzdHJpbmcsIERyYWZ0VHJhbnNmZXJFbnRyeT4oKTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGxhbi5leHBsaWNpdEZpbGVzKSB7XG4gICAgICBpZiAoaXNNYXJrZG93bkZpbGUoZW50cnkuZmlsZSkgJiYgIXNlbGVjdGVkTWFya2Rvd25QYXRocy5oYXMoZW50cnkuZmlsZS5wYXRoKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGRyYWZ0RW50cmllcy5zZXQoXG4gICAgICAgIGVudHJ5LmZpbGUucGF0aCxcbiAgICAgICAgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIGVudHJ5LmZpbGUsIHRydWUsIGVudHJ5LmRlc3RpbmF0aW9uUmVsYXRpdmVQYXRoKSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBtYXJrZG93blBhdGggb2Ygc2VsZWN0ZWRNYXJrZG93blBhdGhzKSB7XG4gICAgICBpZiAoZHJhZnRFbnRyaWVzLmhhcyhtYXJrZG93blBhdGgpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFya2Rvd25GaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobWFya2Rvd25QYXRoKTtcbiAgICAgIGlmIChtYXJrZG93bkZpbGUgJiYgaXNNYXJrZG93bkZpbGUobWFya2Rvd25GaWxlKSkge1xuICAgICAgICBkcmFmdEVudHJpZXMuc2V0KG1hcmtkb3duUGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIG1hcmtkb3duRmlsZSwgZmFsc2UpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VsZWN0ZWRSZXZpZXdQYXRocykge1xuICAgICAgZm9yIChjb25zdCBzZWxlY3RlZFBhdGggb2Ygc2VsZWN0ZWRSZXZpZXdQYXRocykge1xuICAgICAgICBpZiAoZHJhZnRFbnRyaWVzLmhhcyhzZWxlY3RlZFBhdGgpIHx8IHNlbGVjdGVkTWFya2Rvd25QYXRocy5oYXMoc2VsZWN0ZWRQYXRoKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHNlbGVjdGVkUGF0aCk7XG4gICAgICAgIGlmIChzZWxlY3RlZEZpbGUgJiYgIWlzTWFya2Rvd25GaWxlKHNlbGVjdGVkRmlsZSkpIHtcbiAgICAgICAgICBkcmFmdEVudHJpZXMuc2V0KHNlbGVjdGVkUGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIHNlbGVjdGVkRmlsZSwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbmNsdWRlTGlua2VkRmlsZXMpIHtcbiAgICAgIGZvciAoY29uc3QgbWFya2Rvd25QYXRoIG9mIHNlbGVjdGVkTWFya2Rvd25QYXRocykge1xuICAgICAgICBjb25zdCBkZXBlbmRlbmNpZXMgPSBwbGFuLmRpcmVjdERlcGVuZGVuY2llcy5nZXQobWFya2Rvd25QYXRoKTtcbiAgICAgICAgaWYgKCFkZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGF0dGFjaG1lbnRQYXRoIG9mIGRlcGVuZGVuY2llcy5hdHRhY2htZW50cykge1xuICAgICAgICAgIGlmIChzZWxlY3RlZFJldmlld1BhdGhzICYmICFzZWxlY3RlZFJldmlld1BhdGhzLmhhcyhhdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZHJhZnRFbnRyaWVzLmhhcyhhdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhdHRhY2htZW50RmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGF0dGFjaG1lbnRQYXRoKTtcbiAgICAgICAgICBpZiAoYXR0YWNobWVudEZpbGUpIHtcbiAgICAgICAgICAgIGRyYWZ0RW50cmllcy5zZXQoYXR0YWNobWVudFBhdGgsIHRoaXMuY3JlYXRlRHJhZnRFbnRyeShwbGFuLCBhdHRhY2htZW50RmlsZSwgZmFsc2UpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnkgPSB7XG4gICAgICByZXF1ZXN0ZWRGaWxlQ291bnQ6IGRyYWZ0RW50cmllcy5zaXplLFxuICAgICAgdHJhbnNmZXJyZWRGaWxlQ291bnQ6IDAsXG4gICAgICBtb3ZlZEZpbGVDb3VudDogMCxcbiAgICAgIHNraXBwZWRDb25mbGljdENvdW50OiAwLFxuICAgICAgcmVuYW1lZENvdW50OiAwLFxuICAgICAgZmFpbGVkQ291bnQ6IDAsXG4gICAgICBza2lwcGVkRW50cmllczogW10sXG4gICAgICB3YXJuaW5nczogW10sXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc29sdmVkRW50cmllcyA9IGF3YWl0IHRoaXMucmVzb2x2ZUNvbmZsaWN0cyhwbGFuLCBbLi4uZHJhZnRFbnRyaWVzLnZhbHVlcygpXSwgc3VtbWFyeSk7XG4gICAgY29uc3QgZGVzdGluYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzb2x2ZWRFbnRyaWVzKSB7XG4gICAgICBkZXN0aW5hdGlvbk1hcC5zZXQoZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgsIGVudHJ5LmRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IHRyYW5zZmVycmVkRmlsZXM6IFRGaWxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc29sdmVkRW50cmllcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIGlmIChlbnRyeS5vdmVyd3JpdGVFeGlzdGluZykge1xuICAgICAgICAgIGF3YWl0IGZzLnJtKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZW50cnkuc2hvdWxkUmV3cml0ZUxpbmtzKSB7XG4gICAgICAgICAgbGV0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuY2FjaGVkUmVhZChlbnRyeS5zb3VyY2VGaWxlKTtcbiAgICAgICAgICBjb250ZW50ID0gdGhpcy5yZXdyaXRlTWFya2Rvd25MaW5rcyhjb250ZW50LCBlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCwgZW50cnkuZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCwgZGVzdGluYXRpb25NYXApO1xuICAgICAgICAgIGNvbnN0IHRhZ1Jlc3VsdCA9IHRoaXMuYXBwbHlEZXN0aW5hdGlvblRhZ3MoY29udGVudCwgbW9kZSwgZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgICAgICAgIGNvbnRlbnQgPSB0YWdSZXN1bHQuY29udGVudDtcbiAgICAgICAgICBpZiAodGFnUmVzdWx0Lndhcm5pbmcpIHtcbiAgICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaCh0YWdSZXN1bHQud2FybmluZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZShlbnRyeS5kZXN0aW5hdGlvbkFic29sdXRlUGF0aCwgY29udGVudCwgXCJ1dGY4XCIpO1xuXG4gICAgICAgICAgaWYgKG1vZGUgPT09IFwiY29weVwiICYmIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50cykge1xuICAgICAgICAgICAgY29uc3Qgc291cmNlVGFnUmVzdWx0ID0gYXdhaXQgdGhpcy50YWdTb3VyY2VNYXJrZG93bihlbnRyeS5zb3VyY2VGaWxlLCB0aGlzLmdldFRhZ3NGb3JNb2RlKG1vZGUpKTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VUYWdSZXN1bHQpIHtcbiAgICAgICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKHNvdXJjZVRhZ1Jlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLmNvcHlGaWxlKGVudHJ5LnNvdXJjZUFic29sdXRlUGF0aCwgZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhbnNmZXJyZWRGaWxlcy5wdXNoKGVudHJ5LnNvdXJjZUZpbGUpO1xuICAgICAgICBzdW1tYXJ5LnRyYW5zZmVycmVkRmlsZUNvdW50ICs9IDE7XG4gICAgICAgIGlmIChlbnRyeS53YXNSZW5hbWVkKSB7XG4gICAgICAgICAgc3VtbWFyeS5yZW5hbWVkQ291bnQgKz0gMTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3VtbWFyeS5mYWlsZWRDb3VudCArPSAxO1xuICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYEZhaWxlZCB0byB0cmFuc2ZlciAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofTogJHt0aGlzLnRvRXJyb3JNZXNzYWdlKGVycm9yLCBcIlVua25vd24gdHJhbnNmZXIgZXJyb3IuXCIpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtb2RlID09PSBcIm1vdmVcIikge1xuICAgICAgc3VtbWFyeS5tb3ZlZEZpbGVDb3VudCA9IGF3YWl0IHRoaXMuZGVsZXRlTW92ZWRTb3VyY2VzKHRyYW5zZmVycmVkRmlsZXMsIHBsYW4uc2VsZWN0ZWRGb2xkZXJQYXRocywgc3VtbWFyeSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1bW1hcnk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURyYWZ0RW50cnkoXG4gICAgcGxhbjogUHJlcGFyZWRUcmFuc2ZlclBsYW4sXG4gICAgZmlsZTogVEZpbGUsXG4gICAgaXNFeHBsaWNpdFNlbGVjdGlvbjogYm9vbGVhbixcbiAgICBleHBsaWNpdERlc3RpbmF0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nLFxuICApOiBEcmFmdFRyYW5zZmVyRW50cnkge1xuICAgIGNvbnN0IHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlLnBhdGgpO1xuICAgIGNvbnN0IHNvdXJjZUFic29sdXRlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChwYXRoLmpvaW4ocGxhbi5zb3VyY2VWYXVsdFJvb3QsIC4uLnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLnNwbGl0KFwiL1wiKSkpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uQmFzZSA9ICFpc0V4cGxpY2l0U2VsZWN0aW9uICYmICFpc01hcmtkb3duRmlsZShmaWxlKVxuICAgICAgPyBwbGFuLnRhcmdldC5lZmZlY3RpdmVBdHRhY2htZW50UGF0aFxuICAgICAgOiBwbGFuLnRhcmdldC5kZXN0aW5hdGlvblBhdGg7XG4gICAgY29uc3QgcmVsYXRpdmVEZXN0aW5hdGlvbiA9IGV4cGxpY2l0RGVzdGluYXRpb25SZWxhdGl2ZVBhdGggPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgY29uc3QgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoXG4gICAgICBwYXRoLmpvaW4oZGVzdGluYXRpb25CYXNlLCAuLi5ub3JtYWxpemVQYXRoKHJlbGF0aXZlRGVzdGluYXRpb24pLnNwbGl0KFwiL1wiKSksXG4gICAgKTtcbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlRmlsZTogZmlsZSxcbiAgICAgIHNvdXJjZUFic29sdXRlUGF0aCxcbiAgICAgIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLFxuICAgICAgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgsXG4gICAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiB0b1ZhdWx0UmVsYXRpdmVQYXRoKHBsYW4udGFyZ2V0LnZhdWx0UGF0aCwgZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpLFxuICAgICAgc2hvdWxkUmV3cml0ZUxpbmtzOiBpc01hcmtkb3duRmlsZShmaWxlKSxcbiAgICAgIGlzRXhwbGljaXRTZWxlY3Rpb24sXG4gICAgICB3YXNSZW5hbWVkOiBmYWxzZSxcbiAgICAgIG92ZXJ3cml0ZUV4aXN0aW5nOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBpc1NlbGVjdGVkTWFya2Rvd25QYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICAgIHJldHVybiAhIWZpbGUgJiYgaXNNYXJrZG93bkZpbGUoZmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlc29sdmVDb25mbGljdHMoXG4gICAgcGxhbjogUHJlcGFyZWRUcmFuc2ZlclBsYW4sXG4gICAgZW50cmllczogRHJhZnRUcmFuc2ZlckVudHJ5W10sXG4gICAgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5LFxuICApOiBQcm9taXNlPEZpbmFsaXplZFRyYW5zZmVyRW50cnlbXT4ge1xuICAgIGNvbnN0IHJlc2VydmVkUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCByZXNvbHZlZDogRmluYWxpemVkVHJhbnNmZXJFbnRyeVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGNvbnN0IGRlc2lyZWRQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoKTtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoZW50cnkuc291cmNlQWJzb2x1dGVQYXRoKTtcbiAgICAgIGNvbnN0IGFscmVhZHlSZXNlcnZlZCA9IHJlc2VydmVkUGF0aHMuaGFzKGRlc2lyZWRQYXRoKTtcbiAgICAgIGNvbnN0IGFscmVhZHlFeGlzdHMgPSBhd2FpdCB0aGlzLnBhdGhFeGlzdHMoZGVzaXJlZFBhdGgpO1xuICAgICAgY29uc3Qgc291cmNlRXF1YWxzRGVzdGluYXRpb24gPSBkZXNpcmVkUGF0aCA9PT0gc291cmNlUGF0aDtcbiAgICAgIGNvbnN0IGhhc0NvbmZsaWN0ID0gYWxyZWFkeVJlc2VydmVkIHx8IGFscmVhZHlFeGlzdHMgfHwgc291cmNlRXF1YWxzRGVzdGluYXRpb247XG5cbiAgICAgIGlmIChoYXNDb25mbGljdCAmJiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5ID09PSBcInNraXBcIikge1xuICAgICAgICBzdW1tYXJ5LnNraXBwZWRDb25mbGljdENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkuc2tpcHBlZEVudHJpZXMucHVzaChlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICAgIGlmIChzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbikge1xuICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgU2tpcHBlZCAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofSBiZWNhdXNlIHNvdXJjZSBhbmQgZGVzdGluYXRpb24gYXJlIGlkZW50aWNhbC5gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYFNraXBwZWQgJHtlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aH0gYmVjYXVzZSAke2Rlc2lyZWRQYXRofSBhbHJlYWR5IGV4aXN0cy5gKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGZpbmFsUGF0aCA9IGRlc2lyZWRQYXRoO1xuICAgICAgbGV0IHdhc1JlbmFtZWQgPSBmYWxzZTtcbiAgICAgIGlmIChoYXNDb25mbGljdCAmJiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9PT0gXCJhdXRvLXJlbmFtZVwiIHx8IGFscmVhZHlSZXNlcnZlZCB8fCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbikpIHtcbiAgICAgICAgZmluYWxQYXRoID0gYXdhaXQgdGhpcy5maW5kQXZhaWxhYmxlUGF0aChkZXNpcmVkUGF0aCwgcmVzZXJ2ZWRQYXRocywgc291cmNlUGF0aCk7XG4gICAgICAgIHdhc1JlbmFtZWQgPSBmaW5hbFBhdGggIT09IGRlc2lyZWRQYXRoO1xuICAgICAgfVxuXG4gICAgICByZXNlcnZlZFBhdGhzLmFkZChmaW5hbFBhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7XG4gICAgICAgIC4uLmVudHJ5LFxuICAgICAgICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aDogZmluYWxQYXRoLFxuICAgICAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiB0b1ZhdWx0UmVsYXRpdmVQYXRoKHBsYW4udGFyZ2V0LnZhdWx0UGF0aCwgZmluYWxQYXRoKSxcbiAgICAgICAgd2FzUmVuYW1lZCxcbiAgICAgICAgb3ZlcndyaXRlRXhpc3Rpbmc6IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3kgPT09IFwib3ZlcndyaXRlXCIgJiYgIXdhc1JlbmFtZWQgJiYgYWxyZWFkeUV4aXN0cyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXNvbHZlZDtcbiAgfVxuXG4gIHByaXZhdGUgcmV3cml0ZU1hcmtkb3duTGlua3MoXG4gICAgY29udGVudDogc3RyaW5nLFxuICAgIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gICAgZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nLFxuICAgIGRlc3RpbmF0aW9uTWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICApOiBzdHJpbmcge1xuICAgIGxldCByZXdyaXR0ZW4gPSBjb250ZW50LnJlcGxhY2UoLyghKT9cXFtcXFsoW15cXF1dKylcXF1cXF0vZywgKG1hdGNoLCBlbWJlZFByZWZpeDogc3RyaW5nIHwgdW5kZWZpbmVkLCBpbm5lcjogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBhbGlhc1NlcGFyYXRvciA9IGlubmVyLmluZGV4T2YoXCJ8XCIpO1xuICAgICAgY29uc3QgbGlua1RleHQgPSBhbGlhc1NlcGFyYXRvciA+PSAwID8gaW5uZXIuc2xpY2UoMCwgYWxpYXNTZXBhcmF0b3IpIDogaW5uZXI7XG4gICAgICBjb25zdCBhbGlhcyA9IGFsaWFzU2VwYXJhdG9yID49IDAgPyBpbm5lci5zbGljZShhbGlhc1NlcGFyYXRvciArIDEpIDogXCJcIjtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUmVmZXJlbmNlKGxpbmtUZXh0LCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hcHBlZFBhdGggPSBkZXN0aW5hdGlvbk1hcC5nZXQocmVzb2x2ZWQudGFyZ2V0RmlsZS5wYXRoKTtcbiAgICAgIGlmICghbWFwcGVkUGF0aCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0UGF0aCA9IHRoaXMudG9XaWtpTGlua1BhdGgoZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCwgbWFwcGVkUGF0aCwgcmVzb2x2ZWQudGFyZ2V0RmlsZS5leHRlbnNpb24pO1xuICAgICAgY29uc3QgcmVidWlsdCA9IGAke25leHRQYXRofSR7cmVzb2x2ZWQuc3VicGF0aH0ke2FsaWFzID8gYHwke2FsaWFzfWAgOiBcIlwifWA7XG4gICAgICByZXR1cm4gYCR7ZW1iZWRQcmVmaXggPz8gXCJcIn1bWyR7cmVidWlsdH1dXWA7XG4gICAgfSk7XG5cbiAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZSgvKCEpP1xcWyhbXlxcXV0qKVxcXVxcKChbXildKylcXCkvZywgKG1hdGNoLCBlbWJlZFByZWZpeDogc3RyaW5nIHwgdW5kZWZpbmVkLCBsYWJlbDogc3RyaW5nLCByYXdIcmVmOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHRoaXMucGFyc2VNYXJrZG93bkhyZWYocmF3SHJlZik7XG4gICAgICBpZiAoIXBhcnNlZCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZVJlZmVyZW5jZShwYXJzZWQucGF0aCwgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXBwZWRQYXRoID0gZGVzdGluYXRpb25NYXAuZ2V0KHJlc29sdmVkLnRhcmdldEZpbGUucGF0aCk7XG4gICAgICBpZiAoIW1hcHBlZFBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVsYXRpdmVMaW5rID0gdGhpcy50b1JlbGF0aXZlTGluayhkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBtYXBwZWRQYXRoKTtcbiAgICAgIGNvbnN0IHJlYnVpbHRIcmVmID0gYCR7dGhpcy5lbmNvZGVNYXJrZG93bkxpbmtQYXRoKHJlbGF0aXZlTGluayl9JHtyZXNvbHZlZC5zdWJwYXRofWA7XG4gICAgICBjb25zdCB3cmFwcGVkSHJlZiA9IHBhcnNlZC53cmFwcGVkSW5BbmdsZXMgPyBgPCR7cmVidWlsdEhyZWZ9PmAgOiByZWJ1aWx0SHJlZjtcbiAgICAgIHJldHVybiBgJHtlbWJlZFByZWZpeCA/PyBcIlwifVske2xhYmVsfV0oJHt3cmFwcGVkSHJlZn0pYDtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXdyaXR0ZW47XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVSZWZlcmVuY2UobGlua1RleHQ6IHN0cmluZywgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZyk6IHsgdGFyZ2V0RmlsZTogVEZpbGU7IHN1YnBhdGg6IHN0cmluZyB9IHwgbnVsbCB7XG4gICAgY29uc3QgaGFzaEluZGV4ID0gbGlua1RleHQuaW5kZXhPZihcIiNcIik7XG4gICAgY29uc3QgcmF3UGF0aCA9IGhhc2hJbmRleCA+PSAwID8gbGlua1RleHQuc2xpY2UoMCwgaGFzaEluZGV4KSA6IGxpbmtUZXh0O1xuICAgIGNvbnN0IHN1YnBhdGggPSBoYXNoSW5kZXggPj0gMCA/IGxpbmtUZXh0LnNsaWNlKGhhc2hJbmRleCkgOiBcIlwiO1xuICAgIGNvbnN0IGRlY29kZWRQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KHJhd1BhdGgudHJpbSgpKTtcbiAgICBpZiAoZGVjb2RlZFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0RmlsZSA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGdldExpbmtwYXRoKGRlY29kZWRQYXRoKSwgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgpO1xuICAgIGlmICghdGFyZ2V0RmlsZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7IHRhcmdldEZpbGUsIHN1YnBhdGggfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VNYXJrZG93bkhyZWYocmF3SHJlZjogc3RyaW5nKTogUGFyc2VkTWFya2Rvd25IcmVmIHwgbnVsbCB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHJhd0hyZWYudHJpbSgpO1xuICAgIGlmICh0cmltbWVkLnN0YXJ0c1dpdGgoXCIjXCIpIHx8IC9eW2Etel0rOi9pLnRlc3QodHJpbW1lZCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB3cmFwcGVkSW5BbmdsZXMgPSB0cmltbWVkLnN0YXJ0c1dpdGgoXCI8XCIpICYmIHRyaW1tZWQuZW5kc1dpdGgoXCI+XCIpICYmIHRyaW1tZWQubGVuZ3RoID4gMjtcbiAgICByZXR1cm4ge1xuICAgICAgcGF0aDogd3JhcHBlZEluQW5nbGVzID8gdHJpbW1lZC5zbGljZSgxLCAtMSkgOiB0cmltbWVkLFxuICAgICAgd3JhcHBlZEluQW5nbGVzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHRvV2lraUxpbmtQYXRoKGN1cnJlbnREZXN0aW5hdGlvbjogc3RyaW5nLCB0YXJnZXREZXN0aW5hdGlvbjogc3RyaW5nLCBleHRlbnNpb246IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVsYXRpdmVMaW5rID0gdGhpcy50b1JlbGF0aXZlTGluayhjdXJyZW50RGVzdGluYXRpb24sIHRhcmdldERlc3RpbmF0aW9uKTtcbiAgICByZXR1cm4gZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkgPT09IFwibWRcIiA/IHJlbGF0aXZlTGluay5yZXBsYWNlKC9cXC5tZCQvaSwgXCJcIikgOiByZWxhdGl2ZUxpbms7XG4gIH1cblxuICBwcml2YXRlIHRvUmVsYXRpdmVMaW5rKGZyb21GaWxlOiBzdHJpbmcsIHRvRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWxhdGl2ZSA9IG5vcm1hbGl6ZVBhdGgocGF0aC5wb3NpeC5yZWxhdGl2ZShwYXRoLnBvc2l4LmRpcm5hbWUoZnJvbUZpbGUpLCB0b0ZpbGUpKTtcbiAgICByZXR1cm4gcmVsYXRpdmUubGVuZ3RoID4gMCA/IHJlbGF0aXZlIDogcGF0aC5wb3NpeC5iYXNlbmFtZSh0b0ZpbGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbmNvZGVNYXJrZG93bkxpbmtQYXRoKGxpbmtQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBlbmNvZGVVUkkobGlua1BhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseURlc3RpbmF0aW9uVGFncyhjb250ZW50OiBzdHJpbmcsIG1vZGU6IFRyYW5zZmVyTW9kZSwgc291cmNlUGF0aDogc3RyaW5nKTogRnJvbnRtYXR0ZXJUYWdSZXN1bHQge1xuICAgIGNvbnN0IHRhZ3MgPSB0aGlzLmdldFRhZ3NGb3JNb2RlKG1vZGUpO1xuICAgIGlmICh0YWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHsgY29udGVudCB9O1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmFkZFRhZ3NUb01hcmtkb3duQ29udGVudChjb250ZW50LCB0YWdzKTtcbiAgICBpZiAocmVzdWx0Lndhcm5pbmcpIHtcbiAgICAgIHJldHVybiB7IGNvbnRlbnQsIHdhcm5pbmc6IGBTa2lwcGVkIHRhZ2dpbmcgJHtzb3VyY2VQYXRofTogJHtyZXN1bHQud2FybmluZ31gIH07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHRhZ1NvdXJjZU1hcmtkb3duKGZpbGU6IFRGaWxlLCB0YWdzOiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGlmICghaXNNYXJrZG93bkZpbGUoZmlsZSkgfHwgdGFncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGN1cnJlbnRDb250ZW50LCB0YWdzKTtcbiAgICBpZiAocmVzdWx0Lndhcm5pbmcpIHtcbiAgICAgIHJldHVybiBgU2tpcHBlZCB0YWdnaW5nIHNvdXJjZSBmaWxlICR7ZmlsZS5wYXRofTogJHtyZXN1bHQud2FybmluZ31gO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LmNvbnRlbnQgIT09IGN1cnJlbnRDb250ZW50KSB7XG4gICAgICBjb25zdCBmcm9udG1hdHRlclJhbmdlID0gY29sbGVjdEZyb250bWF0dGVyUmFuZ2UoY3VycmVudENvbnRlbnQpO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZnJvbnRtYXR0ZXJSYW5nZSAmJiBmcm9udG1hdHRlclJhbmdlICE9PSBcImludmFsaWRcIlxuICAgICAgICA/IGdldEV4aXN0aW5nVGFnRm9ybWF0dGluZyhmcm9udG1hdHRlclJhbmdlLmJvZHkpXG4gICAgICAgIDogXCJ1bmtub3duXCI7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZyb250bWF0dGVyKSA9PiB7XG4gICAgICAgICAgY29uc3QgbWVyZ2VkVGFncyA9IGpvaW5UYWdWYWx1ZXMoZXh0cmFjdEV4aXN0aW5nVGFncyhmcm9udG1hdHRlci50YWdzKSwgdGFncyk7XG4gICAgICAgICAgaWYgKG1lcmdlZFRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBkZWxldGUgZnJvbnRtYXR0ZXIudGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZm9ybWF0ID09PSBcImNvbW1hXCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZvcm1hdCA9PT0gXCJzcGFjZVwiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZnJvbnRtYXR0ZXIudGFncykgfHwgZm9ybWF0ID09PSBcImFycmF5XCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnRhZ3MgPT09IFwic3RyaW5nXCIgfHwgZm9ybWF0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5sZW5ndGggPT09IDEgPyBtZXJnZWRUYWdzWzBdIDogbWVyZ2VkVGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3MubGVuZ3RoID09PSAxID8gbWVyZ2VkVGFnc1swXSA6IG1lcmdlZFRhZ3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBgU2tpcHBlZCB0YWdnaW5nIHNvdXJjZSBmaWxlICR7ZmlsZS5wYXRofTogaW52YWxpZCBmcm9udG1hdHRlci5gO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGNvbnRlbnQ6IHN0cmluZywgdGFnczogc3RyaW5nW10pOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXJSYW5nZSA9IGNvbGxlY3RGcm9udG1hdHRlclJhbmdlKGNvbnRlbnQpO1xuICAgIGlmIChmcm9udG1hdHRlclJhbmdlID09PSBcImludmFsaWRcIikge1xuICAgICAgcmV0dXJuIHsgY29udGVudCwgd2FybmluZzogXCJpbnZhbGlkIGZyb250bWF0dGVyLlwiIH07XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbGRGcm9udG1hdHRlciA9IChmcm9udG1hdHRlckJvZHk6IHN0cmluZyB8IG51bGwpOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCA9PiB7XG4gICAgICBjb25zdCBmb3JtYXQgPSBmcm9udG1hdHRlckJvZHkgPyBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJCb2R5KSA6IFwidW5rbm93blwiO1xuICAgICAgbGV0IHBhcnNlZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcnNlZCA9IGZyb250bWF0dGVyQm9keSA/ICgocGFyc2VZYW1sKGZyb250bWF0dGVyQm9keSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID8/IHt9KSA6IHt9O1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQsIHdhcm5pbmc6IFwiaW52YWxpZCBmcm9udG1hdHRlci5cIiB9O1xuICAgICAgfVxuICAgICAgY29uc3QgbWVyZ2VkVGFncyA9IGpvaW5UYWdWYWx1ZXMoZXh0cmFjdEV4aXN0aW5nVGFncyhwYXJzZWQudGFncyksIHRhZ3MpO1xuICAgICAgaWYgKG1lcmdlZFRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQgfTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZC50YWdzKSkge1xuICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3M7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJzZWQudGFncyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAoZm9ybWF0ID09PSBcImNvbW1hXCIpIHtcbiAgICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiwgXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gXCJzcGFjZVwiKSB7XG4gICAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIgXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMSA/IG1lcmdlZFRhZ3NbMF0gOiBtZXJnZWRUYWdzO1xuICAgICAgfVxuICAgICAgY29uc3QgeWFtbEJvZHkgPSBzdHJpbmdpZnlZYW1sKHBhcnNlZCkudHJpbUVuZCgpO1xuICAgICAgY29uc3QgbmV4dEZyb250bWF0dGVyID0gYC0tLVxcbiR7eWFtbEJvZHl9XFxuLS0tXFxuYDtcbiAgICAgIGlmICghZnJvbnRtYXR0ZXJSYW5nZSkge1xuICAgICAgICByZXR1cm4geyBjb250ZW50OiBgJHtuZXh0RnJvbnRtYXR0ZXJ9JHtjb250ZW50fWAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IGAke25leHRGcm9udG1hdHRlcn0ke2NvbnRlbnQuc2xpY2UoZnJvbnRtYXR0ZXJSYW5nZS5yYW5nZVsxXSl9YCxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGlmICghZnJvbnRtYXR0ZXJSYW5nZSkge1xuICAgICAgcmV0dXJuIGJ1aWxkRnJvbnRtYXR0ZXIobnVsbCk7XG4gICAgfVxuICAgIHJldHVybiBidWlsZEZyb250bWF0dGVyKGZyb250bWF0dGVyUmFuZ2UuYm9keSk7XG4gIH1cblxuICBwcml2YXRlIGdldFRhZ3NGb3JNb2RlKG1vZGU6IFRyYW5zZmVyTW9kZSk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gY2xlYW5UYWdJbnB1dChtb2RlID09PSBcImNvcHlcIiA/IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JDb3BpZWRFbGVtZW50cyA6IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JNb3ZlZEVsZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGVsZXRlTW92ZWRTb3VyY2VzKHRyYW5zZmVycmVkRmlsZXM6IFRGaWxlW10sIHNlbGVjdGVkRm9sZGVyUGF0aHM6IHN0cmluZ1tdLCBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnkpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHVuaXF1ZUZpbGVzID0gWy4uLm5ldyBNYXAodHJhbnNmZXJyZWRGaWxlcy5tYXAoKGZpbGUpID0+IFtmaWxlLnBhdGgsIGZpbGVdKSkudmFsdWVzKCldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5wYXRoLmxlbmd0aCAtIGxlZnQucGF0aC5sZW5ndGgpO1xuICAgIGxldCBkZWxldGVkQ291bnQgPSAwO1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHVuaXF1ZUZpbGVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGZpbGUucGF0aCk7XG4gICAgICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZGVsZXRlKGN1cnJlbnRGaWxlKTtcbiAgICAgICAgZGVsZXRlZENvdW50ICs9IDE7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5LmZhaWxlZENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIGRlbGV0ZSBzb3VyY2UgZmlsZSAke2ZpbGUucGF0aH06ICR7dGhpcy50b0Vycm9yTWVzc2FnZShlcnJvciwgXCJDb3VsZCBub3QgZGVsZXRlIHNvdXJjZSBmaWxlLlwiKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzb3J0ZWRGb2xkZXJzID0gWy4uLnNlbGVjdGVkRm9sZGVyUGF0aHNdLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5sZW5ndGggLSBsZWZ0Lmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBmb2xkZXJQYXRoIG9mIHNvcnRlZEZvbGRlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGb2xkZXJCeVBhdGgoZm9sZGVyUGF0aCk7XG4gICAgICAgIGlmICghZm9sZGVyIHx8IGZvbGRlci5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmRlbGV0ZShmb2xkZXIsIHRydWUpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBGYWlsZWQgdG8gZGVsZXRlIHNvdXJjZSBmb2xkZXIgJHtmb2xkZXJQYXRofTogJHt0aGlzLnRvRXJyb3JNZXNzYWdlKGVycm9yLCBcIkNvdWxkIG5vdCBkZWxldGUgc291cmNlIGZvbGRlci5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGV0ZWRDb3VudDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcGF0aEV4aXN0cyhjYW5kaWRhdGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKGNhbmRpZGF0ZVBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kQXZhaWxhYmxlUGF0aChjYW5kaWRhdGVQYXRoOiBzdHJpbmcsIHJlc2VydmVkUGF0aHM6IFNldDxzdHJpbmc+LCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhdGgucGFyc2UoY2FuZGlkYXRlUGF0aCk7XG4gICAgbGV0IGluZGV4ID0gMTtcbiAgICBsZXQgbmV4dFBhdGggPSBjYW5kaWRhdGVQYXRoO1xuICAgIHdoaWxlIChyZXNlcnZlZFBhdGhzLmhhcyhuZXh0UGF0aCkgfHwgYXdhaXQgdGhpcy5wYXRoRXhpc3RzKG5leHRQYXRoKSB8fCBuZXh0UGF0aCA9PT0gc291cmNlUGF0aCkge1xuICAgICAgbmV4dFBhdGggPSBwYXRoLmpvaW4ocGFyc2VkLmRpciwgYCR7cGFyc2VkLm5hbWV9ICR7aW5kZXh9JHtwYXJzZWQuZXh0fWApO1xuICAgICAgaW5kZXggKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHRQYXRoO1xuICB9XG5cbiAgcHJpdmF0ZSB0b0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93biwgZmFsbGJhY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogZmFsbGJhY2s7XG4gIH1cbn1cblxuY2xhc3MgVGFyZ2V0VmF1bHRTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxEZXN0aW5hdGlvbkNvbmZpZz4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldHM6IERlc3RpbmF0aW9uQ29uZmlnW10sXG4gICAgcGxhY2Vob2xkZXI6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uQ2hvb3NlVGFyZ2V0OiAodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZykgPT4gdm9pZCxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKHBsYWNlaG9sZGVyKTtcbiAgICB0aGlzLmVtcHR5U3RhdGVUZXh0ID0gXCJObyBkZXN0aW5hdGlvbiB2YXVsdHMgYXZhaWxhYmxlLlwiO1xuICB9XG5cbiAgZ2V0SXRlbXMoKTogRGVzdGluYXRpb25Db25maWdbXSB7XG4gICAgcmV0dXJuIHRoaXMudGFyZ2V0cztcbiAgfVxuXG4gIGdldEl0ZW1UZXh0KHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBzdHJpbmcge1xuICAgIHJldHVybiBnZXREZXN0aW5hdGlvbkRpc3BsYXlOYW1lKHRhcmdldCk7XG4gIH1cblxuICByZW5kZXJTdWdnZXN0aW9uKG1hdGNoOiBGdXp6eU1hdGNoPERlc3RpbmF0aW9uQ29uZmlnPiwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gbWF0Y2guaXRlbTtcbiAgICBlbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1zdWdnZXN0LXRpdGxlXCIsIHRleHQ6IGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0KSB9KTtcbiAgICBjb25zdCBkZXRhaWwgPSBbdGFyZ2V0LnZhdWx0UGF0aC50cmltKCksIHRhcmdldC5kZXN0aW5hdGlvblBhdGgudHJpbSgpXS5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKS5qb2luKFwiIC0+IFwiKTtcbiAgICBpZiAoZGV0YWlsLmxlbmd0aCA+IDApIHtcbiAgICAgIGVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXN1Z2dlc3QtZGV0YWlsXCIsIHRleHQ6IGRldGFpbCB9KTtcbiAgICB9XG4gIH1cblxuICBvbkNob29zZUl0ZW0odGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIHRoaXMub25DaG9vc2VUYXJnZXQodGFyZ2V0KTtcbiAgfVxufVxuXG5jbGFzcyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBzZWxlY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVFbGVtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW5wdXRFbGVtZW50PigpO1xuICBwcml2YXRlIHJlc29sdmVQcm9taXNlOiAoKHJlc3VsdDogUmV2aWV3TW9kYWxSZXN1bHQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSByb290czogUmV2aWV3Tm9kZVtdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29uZmxpY3RTdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2Ygcm9vdHMpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU5vZGVTdGF0ZShyb290KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB3YWl0Rm9yUmVzdWx0KCk6IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcInRyYW5zdmF1bHQtcmV2aWV3LW1vZGFsXCIpO1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiUmV2aWV3IGxpbmtlZCBub3Rlc1wiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IGNvbmZsaWN0Tm90aWNlID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LW5vdGljZVwiIH0pO1xuICAgIGNvbmZsaWN0Tm90aWNlLmNyZWF0ZVNwYW4oe1xuICAgICAgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LWJhZGdlXCIsXG4gICAgICB0ZXh0OiBgQ29uZmxpY3QgaGFuZGxpbmc6ICR7Z2V0Q29uZmxpY3RTdHJhdGVneUxhYmVsKHRoaXMuY29uZmxpY3RTdHJhdGVneSl9YCxcbiAgICB9KTtcbiAgICBjb25mbGljdE5vdGljZS5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LXRleHRcIixcbiAgICAgIHRleHQ6IGdldENvbmZsaWN0U3RyYXRlZ3lEZXNjcmlwdGlvbih0aGlzLmNvbmZsaWN0U3RyYXRlZ3kpLFxuICAgIH0pO1xuICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlJldmlldyBkaXJlY3QgbGlua3MgYW5kIGJhY2tsaW5rcyBmb3IgdGhlIHNlbGVjdGVkIE1hcmtkb3duIG5vdGVzLiBUaGUgdHJhbnNmZXIgaW5jbHVkZXMgZXZlcnkgbm90ZSBpbnN0YW5jZSB0aGF0IHJlbWFpbnMgc2VsZWN0ZWQuXCIsXG4gICAgfSk7XG4gICAgY29uc3QgdHJlZSA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy10cmVlXCIgfSk7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVuZGVyTm9kZSh0cmVlLCByb290LCAwKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aW9ucyA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIgfSk7XG4gICAgY29uc3QgY2FuY2VsQnV0dG9uID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FuY2VsXCIgfSk7XG4gICAgY2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICB0aGlzLmZpbmlzaCh7IGNvbmZpcm1lZDogZmFsc2UsIHNlbGVjdGVkUGF0aHM6IFtdIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJUcmFuc2ZlciBzZWxlY3RlZCBpdGVtc1wiIH0pO1xuICAgIGNvbmZpcm1CdXR0b24uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgIGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIHRoaXMuZmluaXNoKHtcbiAgICAgICAgY29uZmlybWVkOiB0cnVlLFxuICAgICAgICBzZWxlY3RlZFBhdGhzOiBbLi4udGhpcy5nZXRTZWxlY3RlZFBhdGhzKCldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yZXNvbHZlUHJvbWlzZSkge1xuICAgICAgdGhpcy5maW5pc2goeyBjb25maXJtZWQ6IGZhbHNlLCBzZWxlY3RlZFBhdGhzOiBbXSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGZpbmlzaChyZXN1bHQ6IFJldmlld01vZGFsUmVzdWx0KTogdm9pZCB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVzb2x2ZVByb21pc2U7XG4gICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IG51bGw7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHJlc29sdmU/LihyZXN1bHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplTm9kZVN0YXRlKG5vZGU6IFJldmlld05vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICB0aGlzLnNlbGVjdGlvblN0YXRlLnNldChub2RlLmlkLCB0cnVlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVOb2RlU3RhdGUoY2hpbGQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyTm9kZShjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIG5vZGU6IFJldmlld05vZGUsIGRlcHRoOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBpdGVtID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LW5vZGVcIiB9KTtcbiAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KFwiLS10cmFuc3ZhdWx0LWRlcHRoXCIsIFN0cmluZyhkZXB0aCkpO1xuICAgIGNvbnN0IHJvdyA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LXJvd1wiIH0pO1xuICAgIHJvdy5hZGRDbGFzcyhgdHJhbnN2YXVsdC1yZXZpZXctcm93LSR7bm9kZS50eXBlfWApO1xuICAgIGNvbnN0IGNoZWNrYm94U2hlbGwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LWNoZWNrYm94LXNoZWxsXCIgfSk7XG4gICAgY29uc3QgY2hlY2tib3ggPSBjaGVja2JveFNoZWxsLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcImNoZWNrYm94XCIgfSk7XG4gICAgdGhpcy5ub2RlRWxlbWVudHMuc2V0KG5vZGUuaWQsIGNoZWNrYm94KTtcbiAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlTm9kZShub2RlLCBjaGVja2JveC5jaGVja2VkKTtcbiAgICAgIHRoaXMucmVmcmVzaFRyZWUoKTtcbiAgICB9KTtcbiAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveFNoZWxsLmNyZWF0ZVNwYW4oeyBjbHM6IFwidHJhbnN2YXVsdC1jaGVjay1pbmRpY2F0b3JcIiB9KTtcbiAgICBjb25zdCBpY29uRWwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy1pY29uXCIgfSk7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICBpZiAobm9kZS5kaXJlY3Rpb24pIHtcbiAgICAgICAgc2V0SWNvbihpY29uRWwsIG5vZGUuZGlyZWN0aW9uID09PSBcInRvXCIgPyBcImxpbmtzLWdvaW5nLW91dFwiIDogXCJsaW5rcy1jb21pbmctaW5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldEljb24oaWNvbkVsLCBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgPyBcImZpbGUtdGV4dFwiIDogXCJmaWxlXCIpO1xuICAgIH1cbiAgICBjb25zdCBsYWJlbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWxhYmVsXCIsIHRleHQ6IG5vZGUubGFiZWwgfSk7XG4gICAgbGFiZWwuYWRkQ2xhc3MoYHRyYW5zdmF1bHQtcmV2aWV3LWxhYmVsLSR7bm9kZS50eXBlfWApO1xuXG4gICAgY29uc3QgY2hpbGRyZW5Db250YWluZXIgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy1jaGlsZHJlblwiIH0pO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKGNoaWxkcmVuQ29udGFpbmVyLCBjaGlsZCwgZGVwdGggKyAxKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDaGVja2JveChub2RlLCBjaGVja2JveCwgaW5kaWNhdG9yKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFRyZWUoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUocm9vdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoTm9kZShub2RlOiBSZXZpZXdOb2RlKTogdm9pZCB7XG4gICAgY29uc3QgY2hlY2tib3ggPSB0aGlzLm5vZGVFbGVtZW50cy5nZXQobm9kZS5pZCk7XG4gICAgaWYgKGNoZWNrYm94KSB7XG4gICAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveC5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi50cmFuc3ZhdWx0LWNoZWNrLWluZGljYXRvclwiKSA/PyBudWxsO1xuICAgICAgaWYgKGluZGljYXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUNoZWNrYm94KG5vZGUsIGNoZWNrYm94LCBpbmRpY2F0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUoY2hpbGQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQ2hlY2tib3gobm9kZTogUmV2aWV3Tm9kZSwgY2hlY2tib3g6IEhUTUxJbnB1dEVsZW1lbnQsIGluZGljYXRvcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuZ2V0Tm9kZVN0YXR1cyhub2RlKTtcbiAgICBjaGVja2JveC5jaGVja2VkID0gc3RhdGUgPT09IFwiY2hlY2tlZFwiO1xuICAgIGNoZWNrYm94LmluZGV0ZXJtaW5hdGUgPSBzdGF0ZSA9PT0gXCJtaXhlZFwiO1xuICAgIGluZGljYXRvci50ZXh0Q29udGVudCA9IHN0YXRlID09PSBcIm1peGVkXCIgPyBcIi1cIiA6IFwiXCI7XG4gICAgaW5kaWNhdG9yLnRvZ2dsZUNsYXNzKFwiaXMtdmlzaWJsZVwiLCBzdGF0ZSA9PT0gXCJtaXhlZFwiKTtcbiAgICBjaGVja2JveC5kYXRhc2V0LnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICBwcml2YXRlIGdldE5vZGVTdGF0dXMobm9kZTogUmV2aWV3Tm9kZSk6IFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIiB7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21iaW5lU3RhdHVzZXMobm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkKSA9PiB0aGlzLmdldE5vZGVTdGF0dXMoY2hpbGQpKSk7XG4gICAgfVxuICAgIGNvbnN0IHNlbGZTZWxlY3RlZCA9IHRoaXMuc2VsZWN0aW9uU3RhdGUuZ2V0KG5vZGUuaWQpID8/IGZhbHNlO1xuICAgIGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNlbGZTZWxlY3RlZCA/IFwiY2hlY2tlZFwiIDogXCJ1bmNoZWNrZWRcIjtcbiAgICB9XG4gICAgY29uc3QgY2hpbGRTdGF0dXMgPSB0aGlzLmNvbWJpbmVTdGF0dXNlcyhub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQpID0+IHRoaXMuZ2V0Tm9kZVN0YXR1cyhjaGlsZCkpKTtcbiAgICBpZiAoc2VsZlNlbGVjdGVkICYmIGNoaWxkU3RhdHVzID09PSBcImNoZWNrZWRcIikge1xuICAgICAgcmV0dXJuIFwiY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoIXNlbGZTZWxlY3RlZCAmJiBjaGlsZFN0YXR1cyA9PT0gXCJ1bmNoZWNrZWRcIikge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIHJldHVybiBcIm1peGVkXCI7XG4gIH1cblxuICBwcml2YXRlIGNvbWJpbmVTdGF0dXNlcyhzdGF0dXNlczogQXJyYXk8XCJjaGVja2VkXCIgfCBcInVuY2hlY2tlZFwiIHwgXCJtaXhlZFwiPik6IFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIiB7XG4gICAgaWYgKHN0YXR1c2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIGlmIChzdGF0dXNlcy5ldmVyeSgoc3RhdHVzKSA9PiBzdGF0dXMgPT09IFwiY2hlY2tlZFwiKSkge1xuICAgICAgcmV0dXJuIFwiY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoc3RhdHVzZXMuZXZlcnkoKHN0YXR1cykgPT4gc3RhdHVzID09PSBcInVuY2hlY2tlZFwiKSkge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIHJldHVybiBcIm1peGVkXCI7XG4gIH1cblxuICBwcml2YXRlIHRvZ2dsZU5vZGUobm9kZTogUmV2aWV3Tm9kZSwgY2hlY2tlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmIChub2RlLnR5cGUgPT09IFwibm90ZVwiIHx8IG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uU3RhdGUuc2V0KG5vZGUuaWQsIGNoZWNrZWQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMudG9nZ2xlTm9kZShjaGlsZCwgY2hlY2tlZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTZWxlY3RlZFBhdGhzKCk6IFNldDxzdHJpbmc+IHtcbiAgICBjb25zdCBzZWxlY3RlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgcm9vdCBvZiB0aGlzLnJvb3RzKSB7XG4gICAgICB0aGlzLmNvbGxlY3RTZWxlY3RlZFBhdGhzKHJvb3QsIHNlbGVjdGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGVjdGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0U2VsZWN0ZWRQYXRocyhub2RlOiBSZXZpZXdOb2RlLCBzaW5rOiBTZXQ8c3RyaW5nPik6IHZvaWQge1xuICAgIGlmICgobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSAmJiBub2RlLmZpbGVQYXRoICYmICh0aGlzLnNlbGVjdGlvblN0YXRlLmdldChub2RlLmlkKSA/PyBmYWxzZSkpIHtcbiAgICAgIHNpbmsuYWRkKG5vZGUuZmlsZVBhdGgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMuY29sbGVjdFNlbGVjdGVkUGF0aHMoY2hpbGQsIHNpbmspO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBUcmFuc1ZhdWx0U2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4sIHByaXZhdGUgcmVhZG9ubHkgZGVzdGluYXRpb25SZXNvbHZlcjogRGVzdGluYXRpb25SZXNvbHZlcikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlJlbGVhc2Ugbm90ZXNcIilcbiAgICAgIC5zZXREZXNjKFwiUmVhZCB3aGF0IGNoYW5nZWQgaW4gdGhpcyB2ZXJzaW9uLlwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2hvdyByZWxlYXNlIG5vdGVzXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgIG5ldyBSZWxlYXNlTm90ZXNNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiYnJcIik7XG5cbiAgICB0aGlzLmFkZERyb3Bkb3duU2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJDb25mbGljdCBoYW5kbGluZ1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ2hvb3NlIHdoZXRoZXIgZXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgYXJlIHNraXBwZWQsIHJlbmFtZWQgYXV0b21hdGljYWxseSwgb3Igb3ZlcndyaXR0ZW4uXCIsXG4gICAgICBvcHRpb25zOiAoT2JqZWN0LmVudHJpZXMoQ09ORkxJQ1RfU1RSQVRFR1lfTUVUQURBVEEpIGFzIEFycmF5PFtDb25mbGljdFN0cmF0ZWd5LCB0eXBlb2YgQ09ORkxJQ1RfU1RSQVRFR1lfTUVUQURBVEFbQ29uZmxpY3RTdHJhdGVneV1dPilcbiAgICAgICAgLm1hcCgoW3ZhbHVlLCBtZXRhXSkgPT4gKHsgdmFsdWUsIGxhYmVsOiBtZXRhLmxhYmVsIH0pKSxcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5LFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5ID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVG9nZ2xlU2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJJbmNsdWRlIGxpbmtlZCBmaWxlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiSW5jbHVkZSBkaXJlY3RseSByZWxhdGVkIG5vdGVzIGFuZCBsaW5rZWQgbm9uLU1hcmtkb3duIGZpbGVzIGZyb20gc2VsZWN0ZWQgbm90ZXMuXCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5jbHVkZUxpbmtlZEZpbGVzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbmNsdWRlTGlua2VkRmlsZXMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGREcm9wZG93blNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiUmV2aWV3IGRpYWxvZ1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ2hvb3NlIHdoZW4gdG8gc2hvdyB0aGUgdHJhbnNmZXIgcmV2aWV3IGRpYWxvZy5cIixcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgeyB2YWx1ZTogXCJhbHdheXNcIiwgbGFiZWw6IFwiQWx3YXlzXCIgfSxcbiAgICAgICAgeyB2YWx1ZTogXCJsaW5rZWQtb25seVwiLCBsYWJlbDogXCJPbmx5IHdoZW4gbm90ZXMgYXJlIGxpbmtlZFwiIH0sXG4gICAgICAgIHsgdmFsdWU6IFwibmV2ZXJcIiwgbGFiZWw6IFwiTmV2ZXJcIiB9LFxuICAgICAgXSxcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXZpZXdEaWFsb2dNb2RlLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXZpZXdEaWFsb2dNb2RlID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiVGFncyBmb3IgY29waWVkIG5vdGVzXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJDb21tYS1zZXBhcmF0ZWQgdGFncyBhZGRlZCB0byB0cmFuc2ZlcnJlZCBNYXJrZG93biBmaWxlcyB3aGVuIGNvcHlpbmcuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogXCJjb3BpZWQsIHNlbnRcIixcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yQ29waWVkRWxlbWVudHMsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JDb3BpZWRFbGVtZW50cyA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRvZ2dsZVNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiQWxzbyB0YWcgY29waWVkIHNvdXJjZSBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiV3JpdGUgdGhlIGNvbmZpZ3VyZWQgY29weSB0YWdzIGJhY2sgaW50byBzb3VyY2UgTWFya2Rvd24gZmlsZXMgaW4gdGhlIGFjdGl2ZSB2YXVsdC5cIixcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHMsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50cyA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlRhZ3MgZm9yIG1vdmVkIG5vdGVzXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJDb21tYS1zZXBhcmF0ZWQgdGFncyBhZGRlZCB0byB0cmFuc2ZlcnJlZCBNYXJrZG93biBmaWxlcyB3aGVuIG1vdmluZy5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiBcIm1vdmVkLCBhcmNoaXZlZFwiLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JNb3ZlZEVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yTW92ZWRFbGVtZW50cyA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIkRlc3RpbmF0aW9uIHZhdWx0c1wiKS5zZXRIZWFkaW5nKCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiVXNlIGFic29sdXRlIHBhdGhzLiBEZXN0aW5hdGlvbiBhbmQgYXR0YWNobWVudCBwYXRocyBtdXN0IHN0YXkgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdCByb290LlwiLFxuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cykge1xuICAgICAgdGhpcy5yZW5kZXJEZXN0aW5hdGlvbkNhcmQoY29udGFpbmVyRWwsIHRhcmdldCk7XG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFkZCBkZXN0aW5hdGlvblwiKVxuICAgICAgLnNldERlc2MoXCJDcmVhdGUgYW5vdGhlciBkZXN0aW5hdGlvbiB2YXVsdCBjb25maWd1cmF0aW9uLlwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQWRkIGRlc3RpbmF0aW9uXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMucHVzaChjcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCkpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEZXN0aW5hdGlvbkNhcmQoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCB0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogdm9pZCB7XG4gICAgY29uc3QgY2FyZCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXRhcmdldC1jYXJkXCIgfSk7XG4gICAgY29uc3QgdmFsaWRhdGlvbkhvc3QgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXRhcmdldC12YWxpZGF0aW9uXCIgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiRGVzdGluYXRpb24gbmFtZVwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiTGFiZWwgc2hvd24gaW4gZGVzdGluYXRpb24gc2VsZWN0aW9uIG1lbnVzLlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0KSxcbiAgICAgIHZhbHVlOiB0YXJnZXQubmFtZSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGFyZ2V0Lm5hbWUgPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY2FyZCwge1xuICAgICAgbmFtZTogXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJBYnNvbHV0ZSBwYXRoIHRvIHRoZSByb290IG9mIHRoZSBkZXN0aW5hdGlvbiB2YXVsdC5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiB0aGlzLmV4YW1wbGVQYXRoKFwiVmF1bHRcIiksXG4gICAgICB2YWx1ZTogdGFyZ2V0LnZhdWx0UGF0aCxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGFyZ2V0LnZhdWx0UGF0aCA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgaWYgKHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVEZXRlY3RlZEF0dGFjaG1lbnRQYXRoKHRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjYXJkLCB7XG4gICAgICBuYW1lOiBcIkRlc3RpbmF0aW9uIHBhdGhcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFic29sdXRlIHBhdGggaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdCB3aGVyZSBjb3BpZWQgYW5kIG1vdmVkIGNvbnRlbnQgd2lsbCBsYW5kLlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IHRoaXMuZXhhbXBsZVBhdGgoXCJWYXVsdC9JbmJveFwiKSxcbiAgICAgIHZhbHVlOiB0YXJnZXQuZGVzdGluYXRpb25QYXRoLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0YXJnZXQuZGVzdGluYXRpb25QYXRoID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRvZ2dsZVNldHRpbmcoY2FyZCwge1xuICAgICAgbmFtZTogXCJVc2UgZGVmYXVsdCBhdHRhY2htZW50IGxvY2F0aW9uXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJSZWFkIC5vYnNpZGlhbi9hcHAuanNvbiBpbiB0aGUgZGVzdGluYXRpb24gdmF1bHQgYW5kIHJlc29sdmUgdGhlIGF0dGFjaG1lbnQgZm9sZGVyIGF1dG9tYXRpY2FsbHkuXCIsXG4gICAgICB2YWx1ZTogdGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24sXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uID0gdmFsdWU7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRGV0ZWN0ZWRBdHRhY2htZW50UGF0aCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZGlzcGxheSgpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGlmICghdGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24pIHtcbiAgICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY2FyZCwge1xuICAgICAgICBuYW1lOiBcIkF0dGFjaG1lbnQgcGF0aFwiLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJBYnNvbHV0ZSBwYXRoIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQgZm9yIGxpbmtlZCBub24tTWFya2Rvd24gZmlsZXMuXCIsXG4gICAgICAgIHBsYWNlaG9sZGVyOiB0aGlzLmV4YW1wbGVQYXRoKFwiVmF1bHQvQXR0YWNobWVudHNcIiksXG4gICAgICAgIHZhbHVlOiB0YXJnZXQuYXR0YWNobWVudFBhdGgsXG4gICAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0YXJnZXQuYXR0YWNobWVudFBhdGggPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG5cbiAgICBuZXcgU2V0dGluZyhjYXJkKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJSZW1vdmVcIikuc2V0V2FybmluZygpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cy5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5pZCAhPT0gdGFyZ2V0LmlkKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVkaXNwbGF5KCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVGV4dFNldHRpbmcoXG4gICAgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxuICAgIGNvbmZpZzoge1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICAgIHBsYWNlaG9sZGVyOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogc3RyaW5nO1xuICAgICAgb25DaGFuZ2U6ICh2YWx1ZTogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIH0sXG4gICk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoY29uZmlnLm5hbWUpXG4gICAgICAuc2V0RGVzYyhjb25maWcuZGVzY3JpcHRpb24pXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKGNvbmZpZy5wbGFjZWhvbGRlcikuc2V0VmFsdWUoY29uZmlnLnZhbHVlKS5vbkNoYW5nZShjb25maWcub25DaGFuZ2UpO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFkZFRvZ2dsZVNldHRpbmcoXG4gICAgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxuICAgIGNvbmZpZzoge1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICAgIHZhbHVlOiBib29sZWFuO1xuICAgICAgb25DaGFuZ2U6ICh2YWx1ZTogYm9vbGVhbikgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICB9LFxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKGNvbmZpZy5uYW1lKVxuICAgICAgLnNldERlc2MoY29uZmlnLmRlc2NyaXB0aW9uKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZShjb25maWcudmFsdWUpLm9uQ2hhbmdlKGNvbmZpZy5vbkNoYW5nZSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkRHJvcGRvd25TZXR0aW5nPFQgZXh0ZW5kcyBzdHJpbmc+KFxuICAgIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBjb25maWc6IHtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICBvcHRpb25zOiBBcnJheTx7IHZhbHVlOiBUOyBsYWJlbDogc3RyaW5nIH0+O1xuICAgICAgdmFsdWU6IFQ7XG4gICAgICBvbkNoYW5nZTogKHZhbHVlOiBUKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIH0sXG4gICk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoY29uZmlnLm5hbWUpXG4gICAgICAuc2V0RGVzYyhjb25maWcuZGVzY3JpcHRpb24pXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGNvbmZpZy5vcHRpb25zKSB7XG4gICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKG9wdGlvbi52YWx1ZSwgb3B0aW9uLmxhYmVsKTtcbiAgICAgICAgfVxuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcudmFsdWUpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4gY29uZmlnLm9uQ2hhbmdlKHZhbHVlIGFzIFQpKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzYXZlQW5kUmVkaXNwbGF5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24oY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCB0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uKGNvbnRhaW5lckVsLCB0YXJnZXQpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJWYWxpZGF0aW9uKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29uc3QgZXJyb3JzID0gdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyLnZhbGlkYXRlKHRhcmdldCk7XG4gICAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmICh0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiAmJiB0YXJnZXQuYXR0YWNobWVudFBhdGgudHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IGBEZXRlY3RlZCBhdHRhY2htZW50IHBhdGg6ICR7dGFyZ2V0LmF0dGFjaG1lbnRQYXRoLnRyaW0oKX1gIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGVycm9yIG9mIGVycm9ycykge1xuICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IGVycm9yIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlRGV0ZWN0ZWRBdHRhY2htZW50UGF0aCh0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LnZhdWx0UGF0aCk7XG4gICAgaWYgKCFwYXRoLmlzQWJzb2x1dGUobm9ybWFsaXplZFZhdWx0UGF0aCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoID0gYXdhaXQgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyLnJlc29sdmVEZWZhdWx0QXR0YWNobWVudFBhdGgobm9ybWFsaXplZFZhdWx0UGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGV4YW1wbGVQYXRoKHN1ZmZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiID8gYEM6XFxcXCR7c3VmZml4LnJlcGxhY2UoL1xcLy9nLCBcIlxcXFxcIil9YCA6IGAvVXNlcnMvZXhhbXBsZS8ke3N1ZmZpeC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKX1gO1xuICB9XG59XG5cbmNsYXNzIFJlbGVhc2VOb3Rlc01vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFBsdWdpbikge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJSZWxlYXNlIG5vdGVzXCIpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgdm9pZCBNYXJrZG93blJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcCwgcmVsZWFzZU5vdGVzLCB0aGlzLmNvbnRlbnRFbCwgXCJSRUxFQVNFTk9URVMubWRcIiwgdGhpcy5wbHVnaW4pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyYW5zVmF1bHRQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogVHJhbnNWYXVsdFNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0aW5hdGlvblJlc29sdmVyID0gbmV3IERlc3RpbmF0aW9uUmVzb2x2ZXIoKTtcbiAgcHJpdmF0ZSBwbGFubmVyID0gbmV3IFRyYW5zZmVyUGxhbm5lcih0aGlzLCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIpO1xuICBwcml2YXRlIGV4ZWN1dG9yID0gbmV3IFRyYW5zZmVyRXhlY3V0b3IodGhpcyk7XG4gIHByaXZhdGUgbm90ZWJvb2tOYXZpZ2F0b3JNZW51c1JlZ2lzdGVyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub3RlYm9va05hdmlnYXRvclJldHJ5SW50ZXJ2YWxJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghUGxhdGZvcm0uaXNEZXNrdG9wQXBwKSB7XG4gICAgICBuZXcgTm90aWNlKFwiVHJhbnMgVmF1bHQgaXMgYXZhaWxhYmxlIG9ubHkgb24gZGVza3RvcC5cIiwgMTAwMDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBUcmFuc1ZhdWx0U2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcywgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyKSk7XG4gICAgdGhpcy5yZWdpc3RlckNvbW1hbmRzKCk7XG4gICAgdGhpcy5yZWdpc3RlckNvbnRleHRNZW51cygpO1xuICAgIHRoaXMucmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvckludGVncmF0aW9uKCk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgc3RvcmVkID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgYXMgKFBhcnRpYWw8VHJhbnNWYXVsdFNldHRpbmdzPiAmIHsgc2hvd1Jldmlld0RpYWxvZz86IGJvb2xlYW4gfSkgfCBudWxsO1xuICAgIGNvbnN0IG1pZ3JhdGVkUmV2aWV3RGlhbG9nTW9kZTogUmV2aWV3RGlhbG9nTW9kZSB8IHVuZGVmaW5lZCA9IHN0b3JlZD8ucmV2aWV3RGlhbG9nTW9kZVxuICAgICAgPz8gKHR5cGVvZiBzdG9yZWQ/LnNob3dSZXZpZXdEaWFsb2cgPT09IFwiYm9vbGVhblwiXG4gICAgICAgID8gKHN0b3JlZC5zaG93UmV2aWV3RGlhbG9nID8gXCJsaW5rZWQtb25seVwiIDogXCJuZXZlclwiKVxuICAgICAgICA6IHVuZGVmaW5lZCk7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgICAuLi5zdG9yZWQsXG4gICAgICByZXZpZXdEaWFsb2dNb2RlOiBtaWdyYXRlZFJldmlld0RpYWxvZ01vZGUgPz8gREVGQVVMVF9TRVRUSU5HUy5yZXZpZXdEaWFsb2dNb2RlLFxuICAgICAgdGFyZ2V0czogKHN0b3JlZD8udGFyZ2V0cyA/PyBbXSkubWFwKCh0YXJnZXQpID0+IHtcbiAgICAgICAgY29uc3QgbWlncmF0ZWRUYXJnZXQgPSB7XG4gICAgICAgICAgLi4uY3JlYXRlQmxhbmtEZXN0aW5hdGlvbigpLFxuICAgICAgICAgIC4uLnRhcmdldCxcbiAgICAgICAgICBpZDogdGFyZ2V0LmlkID8/IGNyZWF0ZURlc3RpbmF0aW9uSWQoKSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiAhPT0gXCJib29sZWFuXCIgJiYgIXRhcmdldC5hdHRhY2htZW50UGF0aD8udHJpbSgpKSB7XG4gICAgICAgICAgbWlncmF0ZWRUYXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pZ3JhdGVkVGFyZ2V0O1xuICAgICAgfSksXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRoaXMuc2V0dGluZ3MudGFyZ2V0cykge1xuICAgICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LnZhdWx0UGF0aCk7XG4gICAgICBpZiAodGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24gJiYgcGF0aC5pc0Fic29sdXRlKG5vcm1hbGl6ZWRWYXVsdFBhdGgpKSB7XG4gICAgICAgIHRhcmdldC5hdHRhY2htZW50UGF0aCA9IGF3YWl0IHRoaXMuZGVzdGluYXRpb25SZXNvbHZlci5yZXNvbHZlRGVmYXVsdEF0dGFjaG1lbnRQYXRoKG5vcm1hbGl6ZWRWYXVsdFBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckNvbW1hbmRzKCk6IHZvaWQge1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJjb3B5LWFjdGl2ZS1maWxlLXRvLXZhdWx0XCIsXG4gICAgICBuYW1lOiBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBLmNvcHkuY29tbWFuZE5hbWUsXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHRoaXMuaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQoXCJjb3B5XCIsIGNoZWNraW5nKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwibW92ZS1hY3RpdmUtZmlsZS10by12YXVsdFwiLFxuICAgICAgbmFtZTogVFJBTlNGRVJfTU9ERV9NRVRBREFUQS5tb3ZlLmNvbW1hbmROYW1lLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB0aGlzLmhhbmRsZUFjdGl2ZUZpbGVDb21tYW5kKFwibW92ZVwiLCBjaGVja2luZyksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUFjdGl2ZUZpbGVDb21tYW5kKG1vZGU6IFRyYW5zZmVyTW9kZSwgY2hlY2tpbmc6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGNoZWNraW5nKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgW2FjdGl2ZUZpbGVdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJDb250ZXh0TWVudXMoKTogdm9pZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5hcHAud29ya3NwYWNlIGFzIGFueTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQod29ya3NwYWNlLm9uKFwiZmlsZS1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIFtmaWxlXSk7XG4gICAgfSkpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh3b3Jrc3BhY2Uub24oXCJmaWxlcy1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlczogVEFic3RyYWN0RmlsZVtdKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIGZpbGVzKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnRyeVJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JNZW51cygpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk7XG4gICAgfSkpO1xuXG4gICAgaWYgKCF0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICB0aGlzLm5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgdGhpcy50cnlSZWdpc3Rlck5vdGVib29rTmF2aWdhdG9yTWVudXMoKTtcbiAgICAgIH0sIDIwMDApO1xuICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vdGVib29rTmF2aWdhdG9yID0gKCh0aGlzLmFwcCBhcyB1bmtub3duIGFzIHsgcGx1Z2lucz86IHsgcGx1Z2lucz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0gfSkucGx1Z2lucz8ucGx1Z2lucz8uW1wibm90ZWJvb2stbmF2aWdhdG9yXCJdIGFzIHtcbiAgICAgIGFwaT86IHtcbiAgICAgICAgbWVudXM/OiB7XG4gICAgICAgICAgcmVnaXN0ZXJGaWxlTWVudT86IChjYWxsYmFjazogKGNvbnRleHQ6IGFueSkgPT4gdm9pZCkgPT4gKCgpID0+IHZvaWQpIHwgdm9pZDtcbiAgICAgICAgICByZWdpc3RlckZvbGRlck1lbnU/OiAoY2FsbGJhY2s6IChjb250ZXh0OiBhbnkpID0+IHZvaWQpID0+ICgoKSA9PiB2b2lkKSB8IHZvaWQ7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0gfCB1bmRlZmluZWQpPy5hcGk7XG5cbiAgICBpZiAoIW5vdGVib29rTmF2aWdhdG9yPy5tZW51cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2VGaWxlTWVudSA9IG5vdGVib29rTmF2aWdhdG9yLm1lbnVzLnJlZ2lzdGVyRmlsZU1lbnU/LigoY29udGV4dCkgPT4ge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uID0gQXJyYXkuaXNBcnJheShjb250ZXh0LnNlbGVjdGlvbj8uZmlsZXMpID8gY29udGV4dC5zZWxlY3Rpb24uZmlsZXMgOiBbY29udGV4dC5maWxlXTtcbiAgICAgIHRoaXMuYWRkVHJhbnNmZXJNZW51SXRlbXNUb0V4dGVybmFsTWVudShjb250ZXh0LmFkZEl0ZW0sIHNlbGVjdGlvbik7XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBkaXNwb3NlRmlsZU1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRmlsZU1lbnUpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2VGb2xkZXJNZW51ID0gbm90ZWJvb2tOYXZpZ2F0b3IubWVudXMucmVnaXN0ZXJGb2xkZXJNZW51Py4oKGNvbnRleHQpID0+IHtcbiAgICAgIHRoaXMuYWRkVHJhbnNmZXJNZW51SXRlbXNUb0V4dGVybmFsTWVudShjb250ZXh0LmFkZEl0ZW0sIFtjb250ZXh0LmZvbGRlcl0pO1xuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZGlzcG9zZUZvbGRlck1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRm9sZGVyTWVudSk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgICAgdGhpcy5ub3RlYm9va05hdmlnYXRvclJldHJ5SW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRUcmFuc2Zlck1lbnVJdGVtcyhtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLnBsYW5uZXIubm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbik7XG4gICAgaWYgKG5vcm1hbGl6ZWRTZWxlY3Rpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYWRkTW9kZU1lbnVJdGVtKG1lbnUsIG5vcm1hbGl6ZWRTZWxlY3Rpb24sIFwiY29weVwiKTtcbiAgICB0aGlzLmFkZE1vZGVNZW51SXRlbShtZW51LCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogdm9pZCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbGVjdGlvbiA9IHRoaXMucGxhbm5lci5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBpZiAobm9ybWFsaXplZFNlbGVjdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcImNvcHlcIik7XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZE1vZGVNZW51SXRlbShtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgbW9kZTogVHJhbnNmZXJNb2RlKTogdm9pZCB7XG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTW9kZU1lbnVJdGVtVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCBtb2RlOiBUcmFuc2Zlck1vZGUpOiB2b2lkIHtcbiAgICBhZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uZmlndXJlVHJhbnNmZXJNZW51SXRlbShpdGVtOiBNZW51SXRlbSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10sIG1vZGU6IFRyYW5zZmVyTW9kZSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gVFJBTlNGRVJfTU9ERV9NRVRBREFUQVttb2RlXTtcbiAgICBpdGVtLnNldFRpdGxlKG1ldGFkYXRhLm1lbnVUaXRsZSkuc2V0SWNvbihtZXRhZGF0YS5pY29uKTtcbiAgICBjb25zdCBzZWxlY3RhYmxlVGFyZ2V0cyA9IHRoaXMuZ2V0U2VsZWN0YWJsZVRhcmdldHMoKTtcbiAgICBpZiAoc2VsZWN0YWJsZVRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpdGVtLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlblRhcmdldE1vZGFsKG1vZGU6IFRyYW5zZmVyTW9kZSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5nZXRTZWxlY3RhYmxlVGFyZ2V0cygpO1xuICAgIGlmICh0YXJnZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShcIkFkZCBhIGRlc3RpbmF0aW9uIHZhdWx0IGZpcnN0LlwiLCA4MDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGl0bGUgPSBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBW21vZGVdLnRhcmdldE1vZGFsVGl0bGU7XG4gICAgbmV3IFRhcmdldFZhdWx0U3VnZ2VzdE1vZGFsKHRoaXMuYXBwLCB0YXJnZXRzLCB0aXRsZSwgKHRhcmdldCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnJ1blRyYW5zZmVyKG1vZGUsIHNlbGVjdGlvbiwgdGFyZ2V0KTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGFibGVUYXJnZXRzKCk6IERlc3RpbmF0aW9uQ29uZmlnW10ge1xuICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKCh0YXJnZXQpID0+IHRhcmdldC5uYW1lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuVHJhbnNmZXIobW9kZTogVHJhbnNmZXJNb2RlLCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwbGFuID0gYXdhaXQgdGhpcy5wbGFubmVyLnByZXBhcmUoc2VsZWN0aW9uLCB0YXJnZXQpO1xuICAgICAgY29uc3QgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMgPSBhd2FpdCB0aGlzLm1heWJlUmV2aWV3UGxhbihwbGFuKTtcbiAgICAgIGlmIChjb25maXJtZWRTZWxlY3Rpb25QYXRocyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCB0aGlzLmV4ZWN1dG9yLmV4ZWN1dGUocGxhbiwgbW9kZSwgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpO1xuICAgICAgdGhpcy5zaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGUsIHN1bW1hcnkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJDb3VsZG4ndCBjb21wbGV0ZSB0aGUgdHJhbnNmZXIuXCIsIDEyMDAwKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1heWJlUmV2aWV3UGxhbihwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbik6IFByb21pc2U8c3RyaW5nW10gfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiA9IHBsYW4uZXhwbGljaXRNYXJrZG93blBhdGhzLmxlbmd0aCA+IDA7XG4gICAgY29uc3QgaGFzUmVsZXZhbnRSZWxhdGlvbnNoaXBzID0gcGxhbi5yZXZpZXdSb290cy5zb21lKChyb290KSA9PiByb290LmNoaWxkcmVuLmxlbmd0aCA+IDApO1xuICAgIGlmICghaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiB8fCB0aGlzLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUgPT09IFwibmV2ZXJcIikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9PT0gXCJsaW5rZWQtb25seVwiICYmICFoYXNSZWxldmFudFJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5ldyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgcGxhbi5yZXZpZXdSb290cywgdGhpcy5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5KS53YWl0Rm9yUmVzdWx0KCk7XG4gICAgaWYgKCFyZXN1bHQuY29uZmlybWVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5zZWxlY3RlZFBhdGhzO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGU6IFRyYW5zZmVyTW9kZSwgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5KTogdm9pZCB7XG4gICAgY29uc3QgY29tcGxldGVkQ291bnQgPSBtb2RlID09PSBcImNvcHlcIiA/IHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgOiBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50O1xuICAgIGNvbnN0IGFjdGlvbiA9IG1vZGUgPT09IFwiY29weVwiID8gXCJDb3B5IGNvbXBsZXRlXCIgOiBcIk1vdmUgY29tcGxldGVcIjtcbiAgICBjb25zdCBwYXJ0cyA9IFtgJHtjb21wbGV0ZWRDb3VudH0gb2YgJHtzdW1tYXJ5LnJlcXVlc3RlZEZpbGVDb3VudH0gaXRlbXMgdHJhbnNmZXJyZWRgXTtcbiAgICBpZiAoc3VtbWFyeS5yZW5hbWVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkucmVuYW1lZENvdW50LCBcIml0ZW0gcmVuYW1lZFwiLCBcIml0ZW1zIHJlbmFtZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCwgXCJpdGVtIHNraXBwZWRcIiwgXCJpdGVtcyBza2lwcGVkXCIpKTtcbiAgICB9XG4gICAgaWYgKHN1bW1hcnkuZmFpbGVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkuZmFpbGVkQ291bnQsIFwiaXRlbSBmYWlsZWRcIiwgXCJpdGVtcyBmYWlsZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGggPiAwICYmIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgPT09IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGgsIFwid2FybmluZ1wiLCBcIndhcm5pbmdzXCIpKTtcbiAgICB9XG5cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2VcIjtcbiAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIHRpdGxlLmNsYXNzTmFtZSA9IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZS10aXRsZVwiO1xuICAgICAgdGl0bGUudGV4dENvbnRlbnQgPSBgJHthY3Rpb259IHdpdGggd2FybmluZ3M6ICR7cGFydHMuam9pbihcIiwgXCIpfS5gO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgICAgIGNvbnN0IHNob3duRW50cmllcyA9IHN1bW1hcnkuc2tpcHBlZEVudHJpZXMuc2xpY2UoMCwgMTApO1xuICAgICAgY29uc3QgbGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiKTtcbiAgICAgIGxpc3QuY2xhc3NOYW1lID0gXCJ0cmFuc3ZhdWx0LXNraXAtbm90aWNlLWxpc3RcIjtcbiAgICAgIGZvciAoY29uc3Qgc2tpcHBlZCBvZiBzaG93bkVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgICAgICByb3cudGV4dENvbnRlbnQgPSBza2lwcGVkO1xuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICB9XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGlzdCk7XG4gICAgICBpZiAoc3VtbWFyeS5za2lwcGVkRW50cmllcy5sZW5ndGggPiBzaG93bkVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IG1vcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBtb3JlLmNsYXNzTmFtZSA9IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZS1tb3JlXCI7XG4gICAgICAgIG1vcmUudGV4dENvbnRlbnQgPSBgLi4uIGFuZCAke2Zvcm1hdENvdW50KHN1bW1hcnkuc2tpcHBlZEVudHJpZXMubGVuZ3RoIC0gc2hvd25FbnRyaWVzLmxlbmd0aCwgXCJtb3JlIHNraXBwZWQgaXRlbVwiLCBcIm1vcmUgc2tpcHBlZCBpdGVtc1wiKX0uYDtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG1vcmUpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlzbWlzc0hpbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgZGlzbWlzc0hpbnQuY2xhc3NOYW1lID0gXCJ0cmFuc3ZhdWx0LXNraXAtbm90aWNlLWRpc21pc3NcIjtcbiAgICAgIGRpc21pc3NIaW50LnRleHRDb250ZW50ID0gXCJDbGljayB0byBkaXNtaXNzXCI7XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZGlzbWlzc0hpbnQpO1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgIGNvbnN0IG5vdGljZSA9IG5ldyBOb3RpY2UoZnJhZ21lbnQsIDApIGFzIE5vdGljZSAmIHsgbm90aWNlRWw/OiBIVE1MRWxlbWVudDsgaGlkZT86ICgpID0+IHZvaWQgfTtcbiAgICAgIG5vdGljZS5ub3RpY2VFbD8uYWRkQ2xhc3MoXCJ0cmFuc3ZhdWx0LW5vdGljZS1jbGlja2FibGVcIik7XG4gICAgICBub3RpY2Uubm90aWNlRWw/LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgIG5vdGljZS5oaWRlPy4oKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5ldyBOb3RpY2UoYCR7YWN0aW9ufTogJHtwYXJ0cy5qb2luKFwiLCBcIil9LmAsIDEwMDAwKTtcbiAgfVxufSIsICIjIFRyYW5zIFZhdWx0IFJlbGVhc2UgTm90ZXNcblxuIyMgVmVyc2lvbiAxLjEuMFxuXG4jIyMgQWRkZWRcblxuLSBSZWxlYXNlIG5vdGVzIGNhbiBub3cgYmUgdmlld2VkIGZyb20gdGhlIHNldHRpbmdzIG1lbnUuXG5cbiMjIyBDaGFuZ2VkXG5cbi0gVGhlIGRldGVjdGlvbiBvZiB0aGUgZGVmYXVsdCBhdHRhY2htZW50IHBhdGggaW4gdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGRlZmF1bHRzIG5vdyB0byBcIm9mZlwiLiBObyB1c2VyIGludGVyYWN0aW9uIGlzIHJlcXVp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
