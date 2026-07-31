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
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function isAbstractFile(value) {
  return value instanceof import_obsidian.TFile || value instanceof import_obsidian.TFolder;
}
function getExternalMenuContext(value) {
  if (!isRecord(value)) {
    return null;
  }
  const selection = isRecord(value.selection) && Array.isArray(value.selection.files) ? { files: value.selection.files } : void 0;
  return {
    addItem: typeof value.addItem === "function" ? value.addItem : void 0,
    file: value.file,
    folder: value.folder,
    selection
  };
}
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
  constructor(configDir) {
    this.configDir = configDir;
  }
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
    const configPath = import_path.default.join(normalizedVaultPath, this.configDir, "app.json");
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
        await this.plugin.app.fileManager.trashFile(currentFile);
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
        await this.plugin.app.fileManager.trashFile(folder);
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
        new ReleaseNotesModal(this.app).open();
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
      description: "Read the destination vault configuration and resolve the attachment folder automatically.",
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
  constructor(app) {
    super(app);
    this.renderer = new import_obsidian.Component();
  }
  onOpen() {
    this.titleEl.setText("Release notes");
    this.contentEl.empty();
    void import_obsidian.MarkdownRenderer.render(this.app, RELEASENOTES_default, this.contentEl, "RELEASENOTES.md", this.renderer);
  }
  onClose() {
    this.renderer.unload();
    this.contentEl.empty();
  }
};
var TransVaultPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.destinationResolver = new DestinationResolver(this.app.vault.configDir);
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
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      this.addTransferMenuItems(menu, [file]);
    }));
    this.registerEvent(this.app.workspace.on("files-menu", (menu, files) => {
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
      const menuContext = getExternalMenuContext(context);
      if (!menuContext || !menuContext.addItem) {
        return;
      }
      const selection = Array.isArray(menuContext.selection?.files) ? menuContext.selection.files.filter(isAbstractFile) : isAbstractFile(menuContext.file) ? [menuContext.file] : [];
      this.addTransferMenuItemsToExternalMenu(menuContext.addItem, selection);
    });
    if (typeof disposeFileMenu === "function") {
      this.register(disposeFileMenu);
    }
    const disposeFolderMenu = notebookNavigator.menus.registerFolderMenu?.((context) => {
      const menuContext = getExternalMenuContext(context);
      if (!menuContext || !menuContext.addItem || !isAbstractFile(menuContext.folder)) {
        return;
      }
      this.addTransferMenuItemsToExternalMenu(menuContext.addItem, [menuContext.folder]);
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
      const container = createEl("div", { cls: "transvault-skip-notice" });
      container.createEl("div", { cls: "transvault-skip-notice-title", text: `${action} with warnings: ${parts.join(", ")}.` });
      const shownEntries = summary.skippedEntries.slice(0, 10);
      const list = container.createEl("ul", { cls: "transvault-skip-notice-list" });
      for (const skipped of shownEntries) {
        list.createEl("li", { text: skipped });
      }
      if (summary.skippedEntries.length > shownEntries.length) {
        container.createEl("div", { cls: "transvault-skip-notice-more", text: `... and ${formatCount(summary.skippedEntries.length - shownEntries.length, "more skipped item", "more skipped items")}.` });
      }
      container.createEl("div", { cls: "transvault-skip-notice-dismiss", text: "Click to dismiss" });
      fragment.appendChild(container);
      const notice = new import_obsidian.Notice(fragment, 0);
      notice.messageEl.addClass("transvault-notice-clickable");
      notice.messageEl.addEventListener("click", () => {
        notice.hide();
      });
      return;
    }
    new import_obsidian.Notice(`${action}: ${parts.join(", ")}.`, 1e4);
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyIsICJSRUxFQVNFTk9URVMubWQiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCBvcyBmcm9tIFwib3NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQge1xuICBBcHAsXG4gIENvbXBvbmVudCxcbiAgRmlsZVN5c3RlbUFkYXB0ZXIsXG4gIEZ1enp5TWF0Y2gsXG4gIEZ1enp5U3VnZ2VzdE1vZGFsLFxuICBNZW51LFxuICBNZW51SXRlbSxcbiAgTWFya2Rvd25SZW5kZXJlcixcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGxhdGZvcm0sXG4gIFBsdWdpbixcbiAgUGx1Z2luU2V0dGluZ1RhYixcbiAgU2V0dGluZyxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFRGb2xkZXIsXG4gIGdldExpbmtwYXRoLFxuICBub3JtYWxpemVQYXRoLFxuICBwYXJzZVlhbWwsXG4gIHNldEljb24sXG4gIHN0cmluZ2lmeVlhbWwsXG59IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHJlbGVhc2VOb3RlcyBmcm9tIFwiLi9SRUxFQVNFTk9URVMubWRcIjtcblxudHlwZSBUcmFuc2Zlck1vZGUgPSBcImNvcHlcIiB8IFwibW92ZVwiO1xudHlwZSBDb25mbGljdFN0cmF0ZWd5ID0gXCJza2lwXCIgfCBcImF1dG8tcmVuYW1lXCIgfCBcIm92ZXJ3cml0ZVwiO1xudHlwZSBSZXZpZXdEaXJlY3Rpb24gPSBcInRvXCIgfCBcImZyb21cIjtcbnR5cGUgUmV2aWV3Tm9kZVR5cGUgPSBcIm5vdGVcIiB8IFwiZ3JvdXBcIiB8IFwiYXR0YWNobWVudFwiO1xudHlwZSBSZXZpZXdEaWFsb2dNb2RlID0gXCJhbHdheXNcIiB8IFwibGlua2VkLW9ubHlcIiB8IFwibmV2ZXJcIjtcblxuaW50ZXJmYWNlIERlc3RpbmF0aW9uQ29uZmlnIHtcbiAgaWQ6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICB2YXVsdFBhdGg6IHN0cmluZztcbiAgZGVzdGluYXRpb25QYXRoOiBzdHJpbmc7XG4gIHVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb246IGJvb2xlYW47XG4gIGF0dGFjaG1lbnRQYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUcmFuc1ZhdWx0U2V0dGluZ3Mge1xuICBjb25mbGljdFN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5O1xuICBpbmNsdWRlTGlua2VkRmlsZXM6IGJvb2xlYW47XG4gIHJldmlld0RpYWxvZ01vZGU6IFJldmlld0RpYWxvZ01vZGU7XG4gIHRhZ3NGb3JDb3BpZWRFbGVtZW50czogc3RyaW5nO1xuICBhbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHM6IGJvb2xlYW47XG4gIHRhZ3NGb3JNb3ZlZEVsZW1lbnRzOiBzdHJpbmc7XG4gIHRhcmdldHM6IERlc3RpbmF0aW9uQ29uZmlnW107XG59XG5cbmludGVyZmFjZSBSZXZpZXdOb2RlIHtcbiAgaWQ6IHN0cmluZztcbiAgdHlwZTogUmV2aWV3Tm9kZVR5cGU7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGZpbGVQYXRoPzogc3RyaW5nO1xuICBkaXJlY3Rpb24/OiBSZXZpZXdEaXJlY3Rpb247XG4gIGNoaWxkcmVuOiBSZXZpZXdOb2RlW107XG59XG5cbmludGVyZmFjZSBEaXJlY3REZXBlbmRlbmNpZXMge1xuICBtYXJrZG93bjogU2V0PHN0cmluZz47XG4gIGF0dGFjaG1lbnRzOiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIERpcmVjdFJlbGF0aW9uc2hpcHMgZXh0ZW5kcyBEaXJlY3REZXBlbmRlbmNpZXMge1xuICBiYWNrbGlua3M6IFNldDxzdHJpbmc+O1xufVxuXG5pbnRlcmZhY2UgRXhwbGljaXRGaWxlU2VsZWN0aW9uIHtcbiAgZmlsZTogVEZpbGU7XG4gIGRlc3RpbmF0aW9uUmVsYXRpdmVQYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBSZXNvbHZlZERlc3RpbmF0aW9uQ29uZmlnIGV4dGVuZHMgRGVzdGluYXRpb25Db25maWcge1xuICB2YXVsdFBhdGg6IHN0cmluZztcbiAgZGVzdGluYXRpb25QYXRoOiBzdHJpbmc7XG4gIGVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQcmVwYXJlZFRyYW5zZmVyUGxhbiB7XG4gIHNvdXJjZVZhdWx0Um9vdDogc3RyaW5nO1xuICB0YXJnZXQ6IFJlc29sdmVkRGVzdGluYXRpb25Db25maWc7XG4gIGV4cGxpY2l0RmlsZXM6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdO1xuICBleHBsaWNpdE1hcmtkb3duUGF0aHM6IHN0cmluZ1tdO1xuICBzZWxlY3RlZEZvbGRlclBhdGhzOiBzdHJpbmdbXTtcbiAgcmV2aWV3Um9vdHM6IFJldmlld05vZGVbXTtcbiAgZGlyZWN0RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBEaXJlY3REZXBlbmRlbmNpZXM+O1xuICBkaXJlY3RNYXJrZG93blJlbGF0aW9uczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+O1xufVxuXG5pbnRlcmZhY2UgRHJhZnRUcmFuc2ZlckVudHJ5IHtcbiAgc291cmNlRmlsZTogVEZpbGU7XG4gIHNvdXJjZUFic29sdXRlUGF0aDogc3RyaW5nO1xuICBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIHNob3VsZFJld3JpdGVMaW5rczogYm9vbGVhbjtcbiAgaXNFeHBsaWNpdFNlbGVjdGlvbjogYm9vbGVhbjtcbiAgd2FzUmVuYW1lZDogYm9vbGVhbjtcbiAgb3ZlcndyaXRlRXhpc3Rpbmc6IGJvb2xlYW47XG59XG5cbnR5cGUgRmluYWxpemVkVHJhbnNmZXJFbnRyeSA9IERyYWZ0VHJhbnNmZXJFbnRyeTtcblxuaW50ZXJmYWNlIFRyYW5zZmVyU3VtbWFyeSB7XG4gIHJlcXVlc3RlZEZpbGVDb3VudDogbnVtYmVyO1xuICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogbnVtYmVyO1xuICBtb3ZlZEZpbGVDb3VudDogbnVtYmVyO1xuICBza2lwcGVkQ29uZmxpY3RDb3VudDogbnVtYmVyO1xuICByZW5hbWVkQ291bnQ6IG51bWJlcjtcbiAgZmFpbGVkQ291bnQ6IG51bWJlcjtcbiAgc2tpcHBlZEVudHJpZXM6IHN0cmluZ1tdO1xuICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBSZXZpZXdNb2RhbFJlc3VsdCB7XG4gIGNvbmZpcm1lZDogYm9vbGVhbjtcbiAgc2VsZWN0ZWRQYXRoczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBFeHRlcm5hbE1lbnVDb250ZXh0IHtcbiAgYWRkSXRlbT86IE1lbnVbXCJhZGRJdGVtXCJdO1xuICBmaWxlPzogdW5rbm93bjtcbiAgZm9sZGVyPzogdW5rbm93bjtcbiAgc2VsZWN0aW9uPzogeyBmaWxlcz86IHVua25vd25bXSB9O1xufVxuXG5mdW5jdGlvbiBpc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNBYnN0cmFjdEZpbGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBUQWJzdHJhY3RGaWxlIHtcbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgVEZpbGUgfHwgdmFsdWUgaW5zdGFuY2VvZiBURm9sZGVyO1xufVxuXG5mdW5jdGlvbiBnZXRFeHRlcm5hbE1lbnVDb250ZXh0KHZhbHVlOiB1bmtub3duKTogRXh0ZXJuYWxNZW51Q29udGV4dCB8IG51bGwge1xuICBpZiAoIWlzUmVjb3JkKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGlzUmVjb3JkKHZhbHVlLnNlbGVjdGlvbikgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZS5zZWxlY3Rpb24uZmlsZXMpXG4gICAgPyB7IGZpbGVzOiB2YWx1ZS5zZWxlY3Rpb24uZmlsZXMgfVxuICAgIDogdW5kZWZpbmVkO1xuICByZXR1cm4ge1xuICAgIGFkZEl0ZW06IHR5cGVvZiB2YWx1ZS5hZGRJdGVtID09PSBcImZ1bmN0aW9uXCIgPyB2YWx1ZS5hZGRJdGVtIGFzIE1lbnVbXCJhZGRJdGVtXCJdIDogdW5kZWZpbmVkLFxuICAgIGZpbGU6IHZhbHVlLmZpbGUsXG4gICAgZm9sZGVyOiB2YWx1ZS5mb2xkZXIsXG4gICAgc2VsZWN0aW9uLFxuICB9O1xufVxuXG5pbnRlcmZhY2UgRnJvbnRtYXR0ZXJUYWdSZXN1bHQge1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHdhcm5pbmc/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQYXJzZWRNYXJrZG93bkhyZWYge1xuICBwYXRoOiBzdHJpbmc7XG4gIHdyYXBwZWRJbkFuZ2xlczogYm9vbGVhbjtcbn1cblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogVHJhbnNWYXVsdFNldHRpbmdzID0ge1xuICBjb25mbGljdFN0cmF0ZWd5OiBcInNraXBcIixcbiAgaW5jbHVkZUxpbmtlZEZpbGVzOiB0cnVlLFxuICByZXZpZXdEaWFsb2dNb2RlOiBcImFsd2F5c1wiLFxuICB0YWdzRm9yQ29waWVkRWxlbWVudHM6IFwiXCIsXG4gIGFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50czogZmFsc2UsXG4gIHRhZ3NGb3JNb3ZlZEVsZW1lbnRzOiBcIlwiLFxuICB0YXJnZXRzOiBbXSxcbn07XG5cbmNvbnN0IFRSQU5TRkVSX01PREVfTUVUQURBVEE6IFJlY29yZDxUcmFuc2Zlck1vZGUsIHtcbiAgbWVudVRpdGxlOiBzdHJpbmc7XG4gIGNvbW1hbmROYW1lOiBzdHJpbmc7XG4gIHRhcmdldE1vZGFsVGl0bGU6IHN0cmluZztcbiAgaWNvbjogc3RyaW5nO1xufT4gPSB7XG4gIGNvcHk6IHtcbiAgICBtZW51VGl0bGU6IFwiQ29weSB0byB2YXVsdC4uLlwiLFxuICAgIGNvbW1hbmROYW1lOiBcIkNvcHkgYWN0aXZlIGZpbGUgdG8gdmF1bHQuLi5cIixcbiAgICB0YXJnZXRNb2RhbFRpdGxlOiBcIkNob29zZSBhIHZhdWx0IHRvIGNvcHkgdG9cIixcbiAgICBpY29uOiBcImNvcHktcGx1c1wiLFxuICB9LFxuICBtb3ZlOiB7XG4gICAgbWVudVRpdGxlOiBcIk1vdmUgdG8gdmF1bHQuLi5cIixcbiAgICBjb21tYW5kTmFtZTogXCJNb3ZlIGFjdGl2ZSBmaWxlIHRvIHZhdWx0Li4uXCIsXG4gICAgdGFyZ2V0TW9kYWxUaXRsZTogXCJDaG9vc2UgYSB2YXVsdCB0byBtb3ZlIHRvXCIsXG4gICAgaWNvbjogXCJmb2xkZXItc3ltbGlua1wiLFxuICB9LFxufTtcblxuY29uc3QgQ09ORkxJQ1RfU1RSQVRFR1lfTUVUQURBVEE6IFJlY29yZDxDb25mbGljdFN0cmF0ZWd5LCB7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG59PiA9IHtcbiAgc2tpcDoge1xuICAgIGxhYmVsOiBcIlNraXBcIixcbiAgICBkZXNjcmlwdGlvbjogXCJFeGlzdGluZyBkZXN0aW5hdGlvbiBmaWxlcyB3aWxsIGJlIHNraXBwZWQgZHVyaW5nIHRyYW5zZmVyLlwiLFxuICB9LFxuICBcImF1dG8tcmVuYW1lXCI6IHtcbiAgICBsYWJlbDogXCJBdXRvLXJlbmFtZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIHdpbGwgYmUga2VwdCwgYW5kIG5ldyBjb3BpZXMgd2lsbCBiZSByZW5hbWVkIGF1dG9tYXRpY2FsbHkuXCIsXG4gIH0sXG4gIG92ZXJ3cml0ZToge1xuICAgIGxhYmVsOiBcIk92ZXJ3cml0ZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRyYW5zZmVyLlwiLFxuICB9LFxufTtcblxuZnVuY3Rpb24gY3JlYXRlRGVzdGluYXRpb25JZCgpOiBzdHJpbmcge1xuICByZXR1cm4gYGRlc3RpbmF0aW9uLSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLCA4KX1gO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCk6IERlc3RpbmF0aW9uQ29uZmlnIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogY3JlYXRlRGVzdGluYXRpb25JZCgpLFxuICAgIG5hbWU6IFwiXCIsXG4gICAgdmF1bHRQYXRoOiBcIlwiLFxuICAgIGRlc3RpbmF0aW9uUGF0aDogXCJcIixcbiAgICB1c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uOiBmYWxzZSxcbiAgICBhdHRhY2htZW50UGF0aDogXCJcIixcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0RGVzdGluYXRpb25EaXNwbGF5TmFtZSh0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZE5hbWUgPSB0YXJnZXQubmFtZS50cmltKCk7XG4gIGlmICh0cmltbWVkTmFtZS5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHRyaW1tZWROYW1lO1xuICB9XG4gIGNvbnN0IHRyaW1tZWRWYXVsdFBhdGggPSB0YXJnZXQudmF1bHRQYXRoLnRyaW0oKTtcbiAgaWYgKHRyaW1tZWRWYXVsdFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIFwiVW5uYW1lZCBkZXN0aW5hdGlvblwiO1xuICB9XG4gIGNvbnN0IHBhcnRzID0gdHJpbW1lZFZhdWx0UGF0aC5zcGxpdCgvWy9cXFxcXSsvKS5maWx0ZXIoQm9vbGVhbik7XG4gIHJldHVybiBwYXJ0cy5hdCgtMSkgPz8gdHJpbW1lZFZhdWx0UGF0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmxpY3RTdHJhdGVneUxhYmVsKHN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5KTogc3RyaW5nIHtcbiAgcmV0dXJuIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW3N0cmF0ZWd5XS5sYWJlbDtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmxpY3RTdHJhdGVneURlc2NyaXB0aW9uKHN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5KTogc3RyaW5nIHtcbiAgcmV0dXJuIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW3N0cmF0ZWd5XS5kZXNjcmlwdGlvbjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q291bnQoY291bnQ6IG51bWJlciwgc2luZ3VsYXI6IHN0cmluZywgcGx1cmFsOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7Y291bnR9ICR7Y291bnQgPT09IDEgPyBzaW5ndWxhciA6IHBsdXJhbH1gO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVBYnNvbHV0ZVBhdGgodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLm5vcm1hbGl6ZShwYXRoLnJlc29sdmUodmFsdWUpKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IG5vcm1hbGl6ZWQgPSB2YWx1ZS50cmltKCk7XG4gIGlmIChcbiAgICAobm9ybWFsaXplZC5zdGFydHNXaXRoKCdcIicpICYmIG5vcm1hbGl6ZWQuZW5kc1dpdGgoJ1wiJykpXG4gICAgfHwgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aChcIidcIikgJiYgbm9ybWFsaXplZC5lbmRzV2l0aChcIidcIikpXG4gICkge1xuICAgIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkLnNsaWNlKDEsIC0xKS50cmltKCk7XG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09IFwid2luMzJcIikge1xuICAgIGlmIChub3JtYWxpemVkID09PSBcIn5cIikge1xuICAgICAgbm9ybWFsaXplZCA9IG9zLmhvbWVkaXIoKTtcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aChcIn4vXCIpKSB7XG4gICAgICBub3JtYWxpemVkID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgbm9ybWFsaXplZC5zbGljZSgyKSk7XG4gICAgfSBlbHNlIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCIkSE9NRS9cIikpIHtcbiAgICAgIG5vcm1hbGl6ZWQgPSBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCBub3JtYWxpemVkLnNsaWNlKFwiJEhPTUUvXCIubGVuZ3RoKSk7XG4gICAgfVxuICAgIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkLnJlcGxhY2UoL1xcXFwoWyAhIyQmJygpKjs8Pj9AW1xcXV5ge3x9fl0pL2csIFwiJDFcIik7XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZWQ7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUFic29sdXRlUGF0aCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodmFsdWUpO1xuICBpZiAodHJpbW1lZC5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IGlzIHJlcXVpcmVkLmApO1xuICB9XG4gIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IGJlIGFuIGFic29sdXRlIHBhdGguYCk7XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZUFic29sdXRlUGF0aCh0cmltbWVkKTtcbn1cblxuZnVuY3Rpb24gdG9WYXVsdFJlbGF0aXZlUGF0aCh2YXVsdFJvb3Q6IHN0cmluZywgYWJzb2x1dGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gbm9ybWFsaXplUGF0aChwYXRoLnJlbGF0aXZlKHZhdWx0Um9vdCwgYWJzb2x1dGVQYXRoKS5zcGxpdChwYXRoLnNlcCkuam9pbihcIi9cIikpO1xufVxuXG5mdW5jdGlvbiBjbGVhblRhZ0lucHV0KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdChcIixcIilcbiAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpKVxuICAgIC5maWx0ZXIoKGVudHJ5LCBpbmRleCwgaXRlbXMpID0+IGVudHJ5Lmxlbmd0aCA+IDAgJiYgaXRlbXMuaW5kZXhPZihlbnRyeSkgPT09IGluZGV4KTtcbn1cblxuZnVuY3Rpb24gam9pblRhZ1ZhbHVlcyhleGlzdGluZzogc3RyaW5nW10sIGFkZGl0aW9uczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB0YWcgb2YgWy4uLmV4aXN0aW5nLCAuLi5hZGRpdGlvbnNdKSB7XG4gICAgY29uc3QgY2xlYW4gPSB0YWcudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpO1xuICAgIGlmIChjbGVhbi5sZW5ndGggPiAwKSB7XG4gICAgICBub3JtYWxpemVkLmFkZChjbGVhbik7XG4gICAgfVxuICB9XG4gIHJldHVybiBbLi4ubm9ybWFsaXplZF07XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RGcm9udG1hdHRlclJhbmdlKGNvbnRlbnQ6IHN0cmluZyk6IHsgcmFuZ2U6IFtudW1iZXIsIG51bWJlcl07IGJvZHk6IHN0cmluZyB9IHwgbnVsbCB8IFwiaW52YWxpZFwiIHtcbiAgaWYgKCFjb250ZW50LnN0YXJ0c1dpdGgoXCItLS1cXG5cIikgJiYgIWNvbnRlbnQuc3RhcnRzV2l0aChcIi0tLVxcclxcblwiKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1hdGNoZXIgPSAvXi0tLVxccj9cXG4oW1xcc1xcU10qPylcXHI/XFxuLS0tXFxyP1xcbj8vO1xuICBjb25zdCBtYXRjaCA9IGNvbnRlbnQubWF0Y2gobWF0Y2hlcik7XG4gIGlmICghbWF0Y2ggfHwgbWF0Y2guaW5kZXggIT09IDApIHtcbiAgICByZXR1cm4gXCJpbnZhbGlkXCI7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICByYW5nZTogWzAsIG1hdGNoWzBdLmxlbmd0aF0sXG4gICAgYm9keTogbWF0Y2hbMV0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEV4aXN0aW5nVGFnRm9ybWF0dGluZyhmcm9udG1hdHRlckJvZHk6IHN0cmluZyk6IFwiYXJyYXlcIiB8IFwiY29tbWFcIiB8IFwic3BhY2VcIiB8IFwic3RyaW5nXCIgfCBcInVua25vd25cIiB7XG4gIGNvbnN0IHRhZ3NMaW5lID0gZnJvbnRtYXR0ZXJCb2R5Lm1hdGNoKC9edGFnczpcXHMqKC4rKSQvbSk7XG4gIGlmICghdGFnc0xpbmUpIHtcbiAgICBpZiAoL150YWdzOlxccyokL20udGVzdChmcm9udG1hdHRlckJvZHkpIHx8IC9edGFnczpcXHMqXFxyP1xcbi9tLnRlc3QoZnJvbnRtYXR0ZXJCb2R5KSkge1xuICAgICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgICB9XG4gICAgcmV0dXJuIFwidW5rbm93blwiO1xuICB9XG4gIGNvbnN0IHZhbHVlID0gdGFnc0xpbmVbMV0udHJpbSgpO1xuICBpZiAodmFsdWUuc3RhcnRzV2l0aChcIltcIikpIHtcbiAgICByZXR1cm4gXCJhcnJheVwiO1xuICB9XG4gIGlmICh2YWx1ZS5pbmNsdWRlcyhcIixcIikpIHtcbiAgICByZXR1cm4gXCJjb21tYVwiO1xuICB9XG4gIGlmICgvXFxzLy50ZXN0KHZhbHVlKSkge1xuICAgIHJldHVybiBcInNwYWNlXCI7XG4gIH1cbiAgcmV0dXJuIFwic3RyaW5nXCI7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RFeGlzdGluZ1RhZ3ModmFsdWU6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZVxuICAgICAgLm1hcCgoZW50cnkpID0+ICh0eXBlb2YgZW50cnkgPT09IFwic3RyaW5nXCIgPyBlbnRyeSA6IFN0cmluZyhlbnRyeSA/PyBcIlwiKSkpXG4gICAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpKVxuICAgICAgLmZpbHRlcigoZW50cnkpID0+IGVudHJ5Lmxlbmd0aCA+IDApO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBzZXBhcmF0b3IgPSB2YWx1ZS5pbmNsdWRlcyhcIixcIikgPyBcIixcIiA6IC9cXHMrLztcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgIC5zcGxpdChzZXBhcmF0b3IpXG4gICAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpKVxuICAgICAgLmZpbHRlcigoZW50cnkpID0+IGVudHJ5Lmxlbmd0aCA+IDApO1xuICB9XG4gIHJldHVybiBbXTtcbn1cblxuZnVuY3Rpb24gaXNNYXJrZG93bkZpbGUoZmlsZTogVEZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkgPT09IFwibWRcIjtcbn1cblxuZnVuY3Rpb24gaGFzU2VsZWN0ZWRBbmNlc3RvcihmaWxlUGF0aDogc3RyaW5nLCBzZWxlY3RlZFBhdGhzOiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBjb25zdCBwYXJ0cyA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgpLnNwbGl0KFwiL1wiKTtcbiAgZm9yIChsZXQgaW5kZXggPSAxOyBpbmRleCA8IHBhcnRzLmxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGlmIChzZWxlY3RlZFBhdGhzLmhhcyhwYXJ0cy5zbGljZSgwLCBpbmRleCkuam9pbihcIi9cIikpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5jbGFzcyBEZXN0aW5hdGlvblJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWdEaXI6IHN0cmluZykge31cblxuICBhc3luYyByZXNvbHZlKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPFJlc29sdmVkRGVzdGluYXRpb25Db25maWc+IHtcbiAgICBjb25zdCB2YXVsdFBhdGggPSBlbnN1cmVBYnNvbHV0ZVBhdGgodGFyZ2V0LnZhdWx0UGF0aCwgXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uUGF0aCA9IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQuZGVzdGluYXRpb25QYXRoLCBcIkRlc3RpbmF0aW9uIHBhdGhcIik7XG4gICAgY29uc3QgZWZmZWN0aXZlQXR0YWNobWVudFBhdGggPSB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvblxuICAgICAgPyBhd2FpdCB0aGlzLnJlc29sdmVEZWZhdWx0QXR0YWNobWVudFBhdGgodmF1bHRQYXRoKVxuICAgICAgOiBlbnN1cmVBYnNvbHV0ZVBhdGgodGFyZ2V0LmF0dGFjaG1lbnRQYXRoLCBcIkF0dGFjaG1lbnQgcGF0aFwiKTtcblxuICAgIGF3YWl0IHRoaXMuYXNzZXJ0RGlyZWN0b3J5RXhpc3RzKHZhdWx0UGF0aCwgXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIpO1xuICAgIHRoaXMuYXNzZXJ0SW5zaWRlVmF1bHQodmF1bHRQYXRoLCBkZXN0aW5hdGlvblBhdGgsIFwiRGVzdGluYXRpb24gcGF0aFwiKTtcbiAgICB0aGlzLmFzc2VydEluc2lkZVZhdWx0KHZhdWx0UGF0aCwgZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsIFwiQXR0YWNobWVudCBwYXRoXCIpO1xuICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RpbmF0aW9uUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgZnMubWtkaXIoZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnRhcmdldCxcbiAgICAgIHZhdWx0UGF0aCxcbiAgICAgIGRlc3RpbmF0aW9uUGF0aCxcbiAgICAgIGVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoLFxuICAgICAgYXR0YWNobWVudFBhdGg6IHRhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCksXG4gICAgfTtcbiAgfVxuXG4gIHZhbGlkYXRlKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRyaW1tZWRWYXVsdFBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC52YXVsdFBhdGgpO1xuICAgIGNvbnN0IHRyaW1tZWREZXN0aW5hdGlvblBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC5kZXN0aW5hdGlvblBhdGgpO1xuICAgIGNvbnN0IHRyaW1tZWRBdHRhY2htZW50UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LmF0dGFjaG1lbnRQYXRoKTtcblxuICAgIGlmICh0cmltbWVkVmF1bHRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoIGlzIHJlcXVpcmVkLlwiKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZFZhdWx0UGF0aCkpIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gdmF1bHQgcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICB9XG5cbiAgICBpZiAodHJpbW1lZERlc3RpbmF0aW9uUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gcGF0aCBpcyByZXF1aXJlZC5cIik7XG4gICAgfSBlbHNlIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWREZXN0aW5hdGlvblBhdGgpKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHBhdGggbXVzdCBiZSBhYnNvbHV0ZS5cIik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmlzQWJzb2x1dGUodHJpbW1lZFZhdWx0UGF0aCkgJiYgIXRoaXMuaXNJbnNpZGVWYXVsdCh0cmltbWVkVmF1bHRQYXRoLCB0cmltbWVkRGVzdGluYXRpb25QYXRoKSkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiBwYXRoIG11c3QgYmUgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdC5cIik7XG4gICAgfVxuXG4gICAgaWYgKCF0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgaWYgKHRyaW1tZWRBdHRhY2htZW50UGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggaXMgcmVxdWlyZWQgd2hlbiBhdXRvbWF0aWMgYXR0YWNobWVudCBkZXRlY3Rpb24gaXMgZGlzYWJsZWQuXCIpO1xuICAgICAgfSBlbHNlIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWRBdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggbXVzdCBiZSBhYnNvbHV0ZS5cIik7XG4gICAgICB9IGVsc2UgaWYgKHBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSAmJiAhdGhpcy5pc0luc2lkZVZhdWx0KHRyaW1tZWRWYXVsdFBhdGgsIHRyaW1tZWRBdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggbXVzdCBiZSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JzO1xuICB9XG5cbiAgYXN5bmMgcmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aCh2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aCh2YXVsdFBhdGgpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwYXRoLmpvaW4obm9ybWFsaXplZFZhdWx0UGF0aCwgdGhpcy5jb25maWdEaXIsIFwiYXBwLmpzb25cIik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGNvbmZpZ1BhdGgsIFwidXRmOFwiKTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KSBhcyB7IGF0dGFjaG1lbnRGb2xkZXJQYXRoPzogc3RyaW5nIH07XG4gICAgICBjb25zdCBhdHRhY2htZW50Rm9sZGVyUGF0aCA9IHBhcnNlZC5hdHRhY2htZW50Rm9sZGVyUGF0aD8udHJpbSgpO1xuICAgICAgaWYgKCFhdHRhY2htZW50Rm9sZGVyUGF0aCkge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplZFZhdWx0UGF0aDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc29sdmVkID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHBhdGgucmVzb2x2ZShub3JtYWxpemVkVmF1bHRQYXRoLCBhdHRhY2htZW50Rm9sZGVyUGF0aCkpO1xuICAgICAgaWYgKCF0aGlzLmlzSW5zaWRlVmF1bHQobm9ybWFsaXplZFZhdWx0UGF0aCwgcmVzb2x2ZWQpKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVkVmF1bHRQYXRoO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRWYXVsdFBhdGg7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhc3NlcnREaXJlY3RvcnlFeGlzdHMoZGlyZWN0b3J5UGF0aDogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5zdGF0KGRpcmVjdG9yeVBhdGgpO1xuICAgICAgaWYgKCFzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IHBvaW50IHRvIGEgZGlyZWN0b3J5LmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSBcIkVOT0VOVFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzc2VydEluc2lkZVZhdWx0KHZhdWx0UGF0aDogc3RyaW5nLCBjYW5kaWRhdGVQYXRoOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNJbnNpZGVWYXVsdCh2YXVsdFBhdGgsIGNhbmRpZGF0ZVBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IG11c3QgYmUgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGlzSW5zaWRlVmF1bHQodmF1bHRQYXRoOiBzdHJpbmcsIGNhbmRpZGF0ZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZShub3JtYWxpemVBYnNvbHV0ZVBhdGgodmF1bHRQYXRoKSwgbm9ybWFsaXplQWJzb2x1dGVQYXRoKGNhbmRpZGF0ZVBhdGgpKTtcbiAgICByZXR1cm4gIShyZWxhdGl2ZS5zdGFydHNXaXRoKFwiLi5cIikgfHwgcGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlKSk7XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNmZXJQbGFubmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4sIHByaXZhdGUgcmVhZG9ubHkgZGVzdGluYXRpb25SZXNvbHZlcjogRGVzdGluYXRpb25SZXNvbHZlcikge31cblxuICBhc3luYyBwcmVwYXJlKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCB0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogUHJvbWlzZTxQcmVwYXJlZFRyYW5zZmVyUGxhbj4ge1xuICAgIGNvbnN0IHNvdXJjZVZhdWx0Um9vdCA9IHRoaXMuZ2V0U291cmNlVmF1bHRSb290KCk7XG4gICAgY29uc3QgcmVzb2x2ZWRUYXJnZXQgPSBhd2FpdCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIucmVzb2x2ZSh0YXJnZXQpO1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLm5vcm1hbGl6ZVNlbGVjdGlvbihzZWxlY3Rpb24pO1xuICAgIGNvbnN0IGV4cGxpY2l0RmlsZXMgPSB0aGlzLmNvbGxlY3RFeHBsaWNpdEZpbGVzKG5vcm1hbGl6ZWRTZWxlY3Rpb24pO1xuXG4gICAgaWYgKGV4cGxpY2l0RmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgc2VsZWN0aW9uIGRvZXMgbm90IGNvbnRhaW4gYW55IGZpbGVzIHRvIHRyYW5zZmVyLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBsaWNpdE1hcmtkb3duRmlsZXMgPSBleHBsaWNpdEZpbGVzLm1hcCgoZW50cnkpID0+IGVudHJ5LmZpbGUpLmZpbHRlcihpc01hcmtkb3duRmlsZSk7XG4gICAgY29uc3QgcmV2aWV3Um9vdHM6IFJldmlld05vZGVbXSA9IFtdO1xuICAgIGNvbnN0IGRpcmVjdERlcGVuZGVuY2llcyA9IG5ldyBNYXA8c3RyaW5nLCBEaXJlY3REZXBlbmRlbmNpZXM+KCk7XG4gICAgY29uc3QgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgY29uc3QgcmVsYXRpb25zaGlwc0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIERpcmVjdFJlbGF0aW9uc2hpcHM+KCk7XG5cbiAgICBjb25zdCBnZXRSZWxhdGlvbnNoaXBzID0gKGZpbGU6IFRGaWxlKTogRGlyZWN0UmVsYXRpb25zaGlwcyA9PiB7XG4gICAgICBjb25zdCBjYWNoZWQgPSByZWxhdGlvbnNoaXBzQ2FjaGUuZ2V0KGZpbGUucGF0aCk7XG4gICAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgIHJldHVybiBjYWNoZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCByZWxhdGlvbnNoaXBzID0gdGhpcy5jb2xsZWN0RGlyZWN0UmVsYXRpb25zaGlwcyhmaWxlKTtcbiAgICAgIHJlbGF0aW9uc2hpcHNDYWNoZS5zZXQoZmlsZS5wYXRoLCByZWxhdGlvbnNoaXBzKTtcbiAgICAgIGRpcmVjdERlcGVuZGVuY2llcy5zZXQoZmlsZS5wYXRoLCB7XG4gICAgICAgIG1hcmtkb3duOiByZWxhdGlvbnNoaXBzLm1hcmtkb3duLFxuICAgICAgICBhdHRhY2htZW50czogcmVsYXRpb25zaGlwcy5hdHRhY2htZW50cyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcHM7XG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBleHBsaWNpdE1hcmtkb3duRmlsZXMpIHtcbiAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBnZXRSZWxhdGlvbnNoaXBzKGZpbGUpO1xuICAgICAgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnMuc2V0KGZpbGUucGF0aCwgbmV3IFNldDxzdHJpbmc+KFtcbiAgICAgICAgLi4ucmVsYXRpb25zaGlwcy5tYXJrZG93bixcbiAgICAgICAgLi4ucmVsYXRpb25zaGlwcy5iYWNrbGlua3MsXG4gICAgICBdKSk7XG5cbiAgICAgIGNvbnN0IGdyb3VwczogUmV2aWV3Tm9kZVtdID0gdGhpcy5jcmVhdGVBdHRhY2htZW50R3JvdXAoZmlsZS5wYXRoLCBmaWxlLnBhdGgsIGdldFJlbGF0aW9uc2hpcHMpO1xuICAgICAgaWYgKHJlbGF0aW9uc2hpcHMubWFya2Rvd24uc2l6ZSA+IDApIHtcbiAgICAgICAgZ3JvdXBzLnB1c2goe1xuICAgICAgICAgIGlkOiBgJHtmaWxlLnBhdGh9Ojp0by1ncm91cGAsXG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIGxhYmVsOiBcImxpbmtzIHRvXCIsXG4gICAgICAgICAgZGlyZWN0aW9uOiBcInRvXCIsXG4gICAgICAgICAgY2hpbGRyZW46IFsuLi5yZWxhdGlvbnNoaXBzLm1hcmtkb3duXVxuICAgICAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAgICAgLm1hcCgobm90ZVBhdGgpID0+IHRoaXMuY3JlYXRlTm90ZU5vZGUoZmlsZS5wYXRoLCBcInRvXCIsIG5vdGVQYXRoLCBnZXRSZWxhdGlvbnNoaXBzKSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHJlbGF0aW9uc2hpcHMuYmFja2xpbmtzLnNpemUgPiAwKSB7XG4gICAgICAgIGdyb3Vwcy5wdXNoKHtcbiAgICAgICAgICBpZDogYCR7ZmlsZS5wYXRofTo6ZnJvbS1ncm91cGAsXG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIGxhYmVsOiBcImxpbmtzIGZyb21cIixcbiAgICAgICAgICBkaXJlY3Rpb246IFwiZnJvbVwiLFxuICAgICAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5iYWNrbGlua3NdXG4gICAgICAgICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpXG4gICAgICAgICAgICAubWFwKChub3RlUGF0aCkgPT4gdGhpcy5jcmVhdGVOb3RlTm9kZShmaWxlLnBhdGgsIFwiZnJvbVwiLCBub3RlUGF0aCwgZ2V0UmVsYXRpb25zaGlwcykpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldmlld1Jvb3RzLnB1c2goe1xuICAgICAgICBpZDogYCR7ZmlsZS5wYXRofTo6cm9vdGAsXG4gICAgICAgIHR5cGU6IFwibm90ZVwiLFxuICAgICAgICBsYWJlbDogZmlsZS5iYXNlbmFtZSxcbiAgICAgICAgZmlsZVBhdGg6IGZpbGUucGF0aCxcbiAgICAgICAgY2hpbGRyZW46IGdyb3VwcyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2VWYXVsdFJvb3QsXG4gICAgICB0YXJnZXQ6IHJlc29sdmVkVGFyZ2V0LFxuICAgICAgZXhwbGljaXRGaWxlcyxcbiAgICAgIGV4cGxpY2l0TWFya2Rvd25QYXRoczogZXhwbGljaXRNYXJrZG93bkZpbGVzLm1hcCgoZmlsZSkgPT4gZmlsZS5wYXRoKSxcbiAgICAgIHNlbGVjdGVkRm9sZGVyUGF0aHM6IG5vcm1hbGl6ZWRTZWxlY3Rpb24uZmlsdGVyKChlbnRyeSk6IGVudHJ5IGlzIFRGb2xkZXIgPT4gZW50cnkgaW5zdGFuY2VvZiBURm9sZGVyKS5tYXAoKGZvbGRlcikgPT4gZm9sZGVyLnBhdGgpLFxuICAgICAgcmV2aWV3Um9vdHMsXG4gICAgICBkaXJlY3REZXBlbmRlbmNpZXMsXG4gICAgICBkaXJlY3RNYXJrZG93blJlbGF0aW9ucyxcbiAgICB9O1xuICB9XG5cbiAgbm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogVEFic3RyYWN0RmlsZVtdIHtcbiAgICBjb25zdCB1bmlxdWUgPSBuZXcgTWFwPHN0cmluZywgVEFic3RyYWN0RmlsZT4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHNlbGVjdGlvbikge1xuICAgICAgdW5pcXVlLnNldChub3JtYWxpemVQYXRoKGVudHJ5LnBhdGgpLCBlbnRyeSk7XG4gICAgfVxuICAgIGNvbnN0IHNlbGVjdGVkUGF0aHMgPSBuZXcgU2V0KHVuaXF1ZS5rZXlzKCkpO1xuICAgIHJldHVybiBbLi4udW5pcXVlLnZhbHVlcygpXS5maWx0ZXIoKGVudHJ5KSA9PiAhaGFzU2VsZWN0ZWRBbmNlc3RvcihlbnRyeS5wYXRoLCBzZWxlY3RlZFBhdGhzKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFNvdXJjZVZhdWx0Um9vdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlcjtcbiAgICBpZiAoIShhZGFwdGVyIGluc3RhbmNlb2YgRmlsZVN5c3RlbUFkYXB0ZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUcmFucyBWYXVsdCByZXF1aXJlcyBhIGRlc2t0b3AgZmlsZSBzeXN0ZW0gYWRhcHRlci5cIik7XG4gICAgfVxuICAgIHJldHVybiBub3JtYWxpemVBYnNvbHV0ZVBhdGgoYWRhcHRlci5nZXRCYXNlUGF0aCgpKTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEV4cGxpY2l0RmlsZXMoc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiBFeHBsaWNpdEZpbGVTZWxlY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwbGljaXRGaWxlczogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHNlbGVjdGlvbikge1xuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgZXhwbGljaXRGaWxlcy5wdXNoKHtcbiAgICAgICAgICBmaWxlOiBlbnRyeSxcbiAgICAgICAgICBkZXN0aW5hdGlvblJlbGF0aXZlUGF0aDogcGF0aC5wb3NpeC5iYXNlbmFtZShub3JtYWxpemVQYXRoKGVudHJ5LnBhdGgpKSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICB0aGlzLmNvbGxlY3RGb2xkZXJGaWxlcyhlbnRyeSwgZW50cnksIGV4cGxpY2l0RmlsZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwbGljaXRGaWxlcztcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEZvbGRlckZpbGVzKGZvbGRlcjogVEZvbGRlciwgcm9vdEZvbGRlcjogVEZvbGRlciwgc2luazogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGZvbGRlci5jaGlsZHJlbikge1xuICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVJbnNpZGVSb290ID0gcGF0aC5wb3NpeC5yZWxhdGl2ZShub3JtYWxpemVQYXRoKHJvb3RGb2xkZXIucGF0aCksIG5vcm1hbGl6ZVBhdGgoY2hpbGQucGF0aCkpO1xuICAgICAgICBzaW5rLnB1c2goe1xuICAgICAgICAgIGZpbGU6IGNoaWxkLFxuICAgICAgICAgIGRlc3RpbmF0aW9uUmVsYXRpdmVQYXRoOiBub3JtYWxpemVQYXRoKHBhdGgucG9zaXguam9pbihyb290Rm9sZGVyLm5hbWUsIHJlbGF0aXZlSW5zaWRlUm9vdCkpLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoY2hpbGQgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdEZvbGRlckZpbGVzKGNoaWxkLCByb290Rm9sZGVyLCBzaW5rKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU5vdGVOb2RlKFxuICAgIHJvb3RQYXRoOiBzdHJpbmcsXG4gICAgZGlyZWN0aW9uOiBSZXZpZXdEaXJlY3Rpb24sXG4gICAgbm90ZVBhdGg6IHN0cmluZyxcbiAgICBnZXRSZWxhdGlvbnNoaXBzOiAoZmlsZTogVEZpbGUpID0+IERpcmVjdFJlbGF0aW9uc2hpcHMsXG4gICk6IFJldmlld05vZGUge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChub3RlUGF0aCk7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBmaWxlICYmIGlzTWFya2Rvd25GaWxlKGZpbGUpXG4gICAgICA/IHRoaXMuY3JlYXRlQXR0YWNobWVudEdyb3VwKGAke3Jvb3RQYXRofTo6JHtkaXJlY3Rpb259Ojoke25vdGVQYXRofWAsIGZpbGUucGF0aCwgZ2V0UmVsYXRpb25zaGlwcylcbiAgICAgIDogW107XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBgJHtyb290UGF0aH06OiR7ZGlyZWN0aW9ufTo6JHtub3RlUGF0aH1gLFxuICAgICAgdHlwZTogXCJub3RlXCIsXG4gICAgICBsYWJlbDogZmlsZT8uYmFzZW5hbWUgPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShub3RlUGF0aCwgXCIubWRcIiksXG4gICAgICBmaWxlUGF0aDogbm90ZVBhdGgsXG4gICAgICBjaGlsZHJlbixcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVBdHRhY2htZW50R3JvdXAoXG4gICAgYnJhbmNoSWQ6IHN0cmluZyxcbiAgICBub3RlUGF0aDogc3RyaW5nLFxuICAgIGdldFJlbGF0aW9uc2hpcHM6IChmaWxlOiBURmlsZSkgPT4gRGlyZWN0UmVsYXRpb25zaGlwcyxcbiAgKTogUmV2aWV3Tm9kZVtdIHtcbiAgICBjb25zdCBub3RlRmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKG5vdGVQYXRoKTtcbiAgICBpZiAoIW5vdGVGaWxlIHx8ICFpc01hcmtkb3duRmlsZShub3RlRmlsZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IGdldFJlbGF0aW9uc2hpcHMobm90ZUZpbGUpO1xuICAgIGlmIChyZWxhdGlvbnNoaXBzLmF0dGFjaG1lbnRzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIFt7XG4gICAgICBpZDogYCR7YnJhbmNoSWR9OjphdHRhY2htZW50cy1ncm91cGAsXG4gICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICBsYWJlbDogXCJhdHRhY2htZW50c1wiLFxuICAgICAgY2hpbGRyZW46IFsuLi5yZWxhdGlvbnNoaXBzLmF0dGFjaG1lbnRzXVxuICAgICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpXG4gICAgICAgIC5tYXAoKGF0dGFjaG1lbnRQYXRoKSA9PiB0aGlzLmNyZWF0ZUF0dGFjaG1lbnROb2RlKGJyYW5jaElkLCBhdHRhY2htZW50UGF0aCkpLFxuICAgIH1dO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVBdHRhY2htZW50Tm9kZShicmFuY2hJZDogc3RyaW5nLCBhdHRhY2htZW50UGF0aDogc3RyaW5nKTogUmV2aWV3Tm9kZSB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGF0dGFjaG1lbnRQYXRoKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGAke2JyYW5jaElkfTo6YXR0YWNobWVudDo6JHthdHRhY2htZW50UGF0aH1gLFxuICAgICAgdHlwZTogXCJhdHRhY2htZW50XCIsXG4gICAgICBsYWJlbDogZmlsZT8ubmFtZSA/PyBwYXRoLnBvc2l4LmJhc2VuYW1lKGF0dGFjaG1lbnRQYXRoKSxcbiAgICAgIGZpbGVQYXRoOiBhdHRhY2htZW50UGF0aCxcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0RGlyZWN0UmVsYXRpb25zaGlwcyhmaWxlOiBURmlsZSk6IERpcmVjdFJlbGF0aW9uc2hpcHMge1xuICAgIGNvbnN0IG1hcmtkb3duID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgYXR0YWNobWVudHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBjYWNoZSA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiBbLi4uKGNhY2hlPy5saW5rcyA/PyBbXSksIC4uLihjYWNoZT8uZW1iZWRzID8/IFtdKSwgLi4uKGNhY2hlPy5mcm9udG1hdHRlckxpbmtzID8/IFtdKV0pIHtcbiAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gdGhpcy5wbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZ2V0TGlua3BhdGgocmVmLmxpbmspLCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKCEoZGVzdGluYXRpb24gaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoaXNNYXJrZG93bkZpbGUoZGVzdGluYXRpb24pKSB7XG4gICAgICAgIG1hcmtkb3duLmFkZChkZXN0aW5hdGlvbi5wYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dGFjaG1lbnRzLmFkZChkZXN0aW5hdGlvbi5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBiYWNrbGlua3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCByZXNvbHZlZExpbmtzID0gKHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlIGFzIHVua25vd24gYXMge1xuICAgICAgcmVzb2x2ZWRMaW5rcz86IFJlY29yZDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIG51bWJlcj4+O1xuICAgIH0pLnJlc29sdmVkTGlua3MgPz8ge307XG4gICAgZm9yIChjb25zdCBbc291cmNlUGF0aCwgdGFyZ2V0c10gb2YgT2JqZWN0LmVudHJpZXMocmVzb2x2ZWRMaW5rcykpIHtcbiAgICAgIGlmICghdGFyZ2V0c1tmaWxlLnBhdGhdKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHNvdXJjZVBhdGgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgJiYgaXNNYXJrZG93bkZpbGUoc291cmNlRmlsZSkpIHtcbiAgICAgICAgYmFja2xpbmtzLmFkZChzb3VyY2VQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWFya2Rvd24sXG4gICAgICBiYWNrbGlua3MsXG4gICAgICBhdHRhY2htZW50cyxcbiAgICB9O1xuICB9XG59XG5cbmNsYXNzIFRyYW5zZmVyRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogVHJhbnNWYXVsdFBsdWdpbikge31cblxuICBhc3luYyBleGVjdXRlKHBsYW46IFByZXBhcmVkVHJhbnNmZXJQbGFuLCBtb2RlOiBUcmFuc2Zlck1vZGUsIGNvbmZpcm1lZFNlbGVjdGlvblBhdGhzPzogc3RyaW5nW10pOiBQcm9taXNlPFRyYW5zZmVyU3VtbWFyeT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkUmV2aWV3UGF0aHMgPSBjb25maXJtZWRTZWxlY3Rpb25QYXRoc1xuICAgICAgPyBuZXcgU2V0PHN0cmluZz4oY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBzZWxlY3RlZE1hcmtkb3duUGF0aHMgPSBzZWxlY3RlZFJldmlld1BhdGhzXG4gICAgICA/IG5ldyBTZXQ8c3RyaW5nPihbLi4uc2VsZWN0ZWRSZXZpZXdQYXRoc10uZmlsdGVyKChlbnRyeSkgPT4gdGhpcy5pc1NlbGVjdGVkTWFya2Rvd25QYXRoKGVudHJ5KSkpXG4gICAgICA6IG5ldyBTZXQ8c3RyaW5nPihwbGFuLmV4cGxpY2l0TWFya2Rvd25QYXRocyk7XG5cbiAgICBjb25zdCBkcmFmdEVudHJpZXMgPSBuZXcgTWFwPHN0cmluZywgRHJhZnRUcmFuc2ZlckVudHJ5PigpO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwbGFuLmV4cGxpY2l0RmlsZXMpIHtcbiAgICAgIGlmIChpc01hcmtkb3duRmlsZShlbnRyeS5maWxlKSAmJiAhc2VsZWN0ZWRNYXJrZG93blBhdGhzLmhhcyhlbnRyeS5maWxlLnBhdGgpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZHJhZnRFbnRyaWVzLnNldChcbiAgICAgICAgZW50cnkuZmlsZS5wYXRoLFxuICAgICAgICB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgZW50cnkuZmlsZSwgdHJ1ZSwgZW50cnkuZGVzdGluYXRpb25SZWxhdGl2ZVBhdGgpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG1hcmtkb3duUGF0aCBvZiBzZWxlY3RlZE1hcmtkb3duUGF0aHMpIHtcbiAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKG1hcmtkb3duUGF0aCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXJrZG93bkZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChtYXJrZG93blBhdGgpO1xuICAgICAgaWYgKG1hcmtkb3duRmlsZSAmJiBpc01hcmtkb3duRmlsZShtYXJrZG93bkZpbGUpKSB7XG4gICAgICAgIGRyYWZ0RW50cmllcy5zZXQobWFya2Rvd25QYXRoLCB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgbWFya2Rvd25GaWxlLCBmYWxzZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxlY3RlZFJldmlld1BhdGhzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNlbGVjdGVkUGF0aCBvZiBzZWxlY3RlZFJldmlld1BhdGhzKSB7XG4gICAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKHNlbGVjdGVkUGF0aCkgfHwgc2VsZWN0ZWRNYXJrZG93blBhdGhzLmhhcyhzZWxlY3RlZFBhdGgpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoc2VsZWN0ZWRQYXRoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkRmlsZSAmJiAhaXNNYXJrZG93bkZpbGUoc2VsZWN0ZWRGaWxlKSkge1xuICAgICAgICAgIGRyYWZ0RW50cmllcy5zZXQoc2VsZWN0ZWRQYXRoLCB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgc2VsZWN0ZWRGaWxlLCBmYWxzZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcykge1xuICAgICAgZm9yIChjb25zdCBtYXJrZG93blBhdGggb2Ygc2VsZWN0ZWRNYXJrZG93blBhdGhzKSB7XG4gICAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IHBsYW4uZGlyZWN0RGVwZW5kZW5jaWVzLmdldChtYXJrZG93blBhdGgpO1xuICAgICAgICBpZiAoIWRlcGVuZGVuY2llcykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYXR0YWNobWVudFBhdGggb2YgZGVwZW5kZW5jaWVzLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdGVkUmV2aWV3UGF0aHMgJiYgIXNlbGVjdGVkUmV2aWV3UGF0aHMuaGFzKGF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKGF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGF0dGFjaG1lbnRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoYXR0YWNobWVudFBhdGgpO1xuICAgICAgICAgIGlmIChhdHRhY2htZW50RmlsZSkge1xuICAgICAgICAgICAgZHJhZnRFbnRyaWVzLnNldChhdHRhY2htZW50UGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIGF0dGFjaG1lbnRGaWxlLCBmYWxzZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHN1bW1hcnk6IFRyYW5zZmVyU3VtbWFyeSA9IHtcbiAgICAgIHJlcXVlc3RlZEZpbGVDb3VudDogZHJhZnRFbnRyaWVzLnNpemUsXG4gICAgICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogMCxcbiAgICAgIG1vdmVkRmlsZUNvdW50OiAwLFxuICAgICAgc2tpcHBlZENvbmZsaWN0Q291bnQ6IDAsXG4gICAgICByZW5hbWVkQ291bnQ6IDAsXG4gICAgICBmYWlsZWRDb3VudDogMCxcbiAgICAgIHNraXBwZWRFbnRyaWVzOiBbXSxcbiAgICAgIHdhcm5pbmdzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzb2x2ZWRFbnRyaWVzID0gYXdhaXQgdGhpcy5yZXNvbHZlQ29uZmxpY3RzKHBsYW4sIFsuLi5kcmFmdEVudHJpZXMudmFsdWVzKCldLCBzdW1tYXJ5KTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiByZXNvbHZlZEVudHJpZXMpIHtcbiAgICAgIGRlc3RpbmF0aW9uTWFwLnNldChlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCwgZW50cnkuZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHJhbnNmZXJyZWRGaWxlczogVEZpbGVbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzb2x2ZWRFbnRyaWVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmRpcm5hbWUoZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKGVudHJ5Lm92ZXJ3cml0ZUV4aXN0aW5nKSB7XG4gICAgICAgICAgYXdhaXQgZnMucm0oZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbnRyeS5zaG91bGRSZXdyaXRlTGlua3MpIHtcbiAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5jYWNoZWRSZWFkKGVudHJ5LnNvdXJjZUZpbGUpO1xuICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLnJld3JpdGVNYXJrZG93bkxpbmtzKGNvbnRlbnQsIGVudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLCBlbnRyeS5kZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBkZXN0aW5hdGlvbk1hcCk7XG4gICAgICAgICAgY29uc3QgdGFnUmVzdWx0ID0gdGhpcy5hcHBseURlc3RpbmF0aW9uVGFncyhjb250ZW50LCBtb2RlLCBlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICAgICAgY29udGVudCA9IHRhZ1Jlc3VsdC5jb250ZW50O1xuICAgICAgICAgIGlmICh0YWdSZXN1bHQud2FybmluZykge1xuICAgICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKHRhZ1Jlc3VsdC53YXJuaW5nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoLCBjb250ZW50LCBcInV0ZjhcIik7XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gXCJjb3B5XCIgJiYgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBzb3VyY2VUYWdSZXN1bHQgPSBhd2FpdCB0aGlzLnRhZ1NvdXJjZU1hcmtkb3duKGVudHJ5LnNvdXJjZUZpbGUsIHRoaXMuZ2V0VGFnc0Zvck1vZGUobW9kZSkpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZVRhZ1Jlc3VsdCkge1xuICAgICAgICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goc291cmNlVGFnUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuY29weUZpbGUoZW50cnkuc291cmNlQWJzb2x1dGVQYXRoLCBlbnRyeS5kZXN0aW5hdGlvbkFic29sdXRlUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2ZlcnJlZEZpbGVzLnB1c2goZW50cnkuc291cmNlRmlsZSk7XG4gICAgICAgIHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgKz0gMTtcbiAgICAgICAgaWYgKGVudHJ5Lndhc1JlbmFtZWQpIHtcbiAgICAgICAgICBzdW1tYXJ5LnJlbmFtZWRDb3VudCArPSAxO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5LmZhaWxlZENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIHRyYW5zZmVyICR7ZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGh9OiAke3RoaXMudG9FcnJvck1lc3NhZ2UoZXJyb3IsIFwiVW5rbm93biB0cmFuc2ZlciBlcnJvci5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1vZGUgPT09IFwibW92ZVwiKSB7XG4gICAgICBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50ID0gYXdhaXQgdGhpcy5kZWxldGVNb3ZlZFNvdXJjZXModHJhbnNmZXJyZWRGaWxlcywgcGxhbi5zZWxlY3RlZEZvbGRlclBhdGhzLCBzdW1tYXJ5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VtbWFyeTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRHJhZnRFbnRyeShcbiAgICBwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbixcbiAgICBmaWxlOiBURmlsZSxcbiAgICBpc0V4cGxpY2l0U2VsZWN0aW9uOiBib29sZWFuLFxuICAgIGV4cGxpY2l0RGVzdGluYXRpb25SZWxhdGl2ZVBhdGg/OiBzdHJpbmcsXG4gICk6IERyYWZ0VHJhbnNmZXJFbnRyeSB7XG4gICAgY29uc3Qgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGggPSBub3JtYWxpemVQYXRoKGZpbGUucGF0aCk7XG4gICAgY29uc3Qgc291cmNlQWJzb2x1dGVQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHBhdGguam9pbihwbGFuLnNvdXJjZVZhdWx0Um9vdCwgLi4uc291cmNlVmF1bHRSZWxhdGl2ZVBhdGguc3BsaXQoXCIvXCIpKSk7XG4gICAgY29uc3QgZGVzdGluYXRpb25CYXNlID0gIWlzRXhwbGljaXRTZWxlY3Rpb24gJiYgIWlzTWFya2Rvd25GaWxlKGZpbGUpXG4gICAgICA/IHBsYW4udGFyZ2V0LmVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoXG4gICAgICA6IHBsYW4udGFyZ2V0LmRlc3RpbmF0aW9uUGF0aDtcbiAgICBjb25zdCByZWxhdGl2ZURlc3RpbmF0aW9uID0gZXhwbGljaXREZXN0aW5hdGlvblJlbGF0aXZlUGF0aCA/PyBwYXRoLnBvc2l4LmJhc2VuYW1lKHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChcbiAgICAgIHBhdGguam9pbihkZXN0aW5hdGlvbkJhc2UsIC4uLm5vcm1hbGl6ZVBhdGgocmVsYXRpdmVEZXN0aW5hdGlvbikuc3BsaXQoXCIvXCIpKSxcbiAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2VGaWxlOiBmaWxlLFxuICAgICAgc291cmNlQWJzb2x1dGVQYXRoLFxuICAgICAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgsXG4gICAgICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCxcbiAgICAgIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHRvVmF1bHRSZWxhdGl2ZVBhdGgocGxhbi50YXJnZXQudmF1bHRQYXRoLCBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCksXG4gICAgICBzaG91bGRSZXdyaXRlTGlua3M6IGlzTWFya2Rvd25GaWxlKGZpbGUpLFxuICAgICAgaXNFeHBsaWNpdFNlbGVjdGlvbixcbiAgICAgIHdhc1JlbmFtZWQ6IGZhbHNlLFxuICAgICAgb3ZlcndyaXRlRXhpc3Rpbmc6IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGlzU2VsZWN0ZWRNYXJrZG93blBhdGgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XG4gICAgcmV0dXJuICEhZmlsZSAmJiBpc01hcmtkb3duRmlsZShmaWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUNvbmZsaWN0cyhcbiAgICBwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbixcbiAgICBlbnRyaWVzOiBEcmFmdFRyYW5zZmVyRW50cnlbXSxcbiAgICBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnksXG4gICk6IFByb21pc2U8RmluYWxpemVkVHJhbnNmZXJFbnRyeVtdPiB7XG4gICAgY29uc3QgcmVzZXJ2ZWRQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHJlc29sdmVkOiBGaW5hbGl6ZWRUcmFuc2ZlckVudHJ5W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgY29uc3QgZGVzaXJlZFBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChlbnRyeS5zb3VyY2VBYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3QgYWxyZWFkeVJlc2VydmVkID0gcmVzZXJ2ZWRQYXRocy5oYXMoZGVzaXJlZFBhdGgpO1xuICAgICAgY29uc3QgYWxyZWFkeUV4aXN0cyA9IGF3YWl0IHRoaXMucGF0aEV4aXN0cyhkZXNpcmVkUGF0aCk7XG4gICAgICBjb25zdCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbiA9IGRlc2lyZWRQYXRoID09PSBzb3VyY2VQYXRoO1xuICAgICAgY29uc3QgaGFzQ29uZmxpY3QgPSBhbHJlYWR5UmVzZXJ2ZWQgfHwgYWxyZWFkeUV4aXN0cyB8fCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbjtcblxuICAgICAgaWYgKGhhc0NvbmZsaWN0ICYmIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3kgPT09IFwic2tpcFwiKSB7XG4gICAgICAgIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgKz0gMTtcbiAgICAgICAgc3VtbWFyeS5za2lwcGVkRW50cmllcy5wdXNoKGVudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICAgICAgaWYgKHNvdXJjZUVxdWFsc0Rlc3RpbmF0aW9uKSB7XG4gICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBTa2lwcGVkICR7ZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGh9IGJlY2F1c2Ugc291cmNlIGFuZCBkZXN0aW5hdGlvbiBhcmUgaWRlbnRpY2FsLmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgU2tpcHBlZCAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofSBiZWNhdXNlICR7ZGVzaXJlZFBhdGh9IGFscmVhZHkgZXhpc3RzLmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgZmluYWxQYXRoID0gZGVzaXJlZFBhdGg7XG4gICAgICBsZXQgd2FzUmVuYW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKGhhc0NvbmZsaWN0ICYmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5ID09PSBcImF1dG8tcmVuYW1lXCIgfHwgYWxyZWFkeVJlc2VydmVkIHx8IHNvdXJjZUVxdWFsc0Rlc3RpbmF0aW9uKSkge1xuICAgICAgICBmaW5hbFBhdGggPSBhd2FpdCB0aGlzLmZpbmRBdmFpbGFibGVQYXRoKGRlc2lyZWRQYXRoLCByZXNlcnZlZFBhdGhzLCBzb3VyY2VQYXRoKTtcbiAgICAgICAgd2FzUmVuYW1lZCA9IGZpbmFsUGF0aCAhPT0gZGVzaXJlZFBhdGg7XG4gICAgICB9XG5cbiAgICAgIHJlc2VydmVkUGF0aHMuYWRkKGZpbmFsUGF0aCk7XG4gICAgICByZXNvbHZlZC5wdXNoKHtcbiAgICAgICAgLi4uZW50cnksXG4gICAgICAgIGRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoOiBmaW5hbFBhdGgsXG4gICAgICAgIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHRvVmF1bHRSZWxhdGl2ZVBhdGgocGxhbi50YXJnZXQudmF1bHRQYXRoLCBmaW5hbFBhdGgpLFxuICAgICAgICB3YXNSZW5hbWVkLFxuICAgICAgICBvdmVyd3JpdGVFeGlzdGluZzogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9PT0gXCJvdmVyd3JpdGVcIiAmJiAhd2FzUmVuYW1lZCAmJiBhbHJlYWR5RXhpc3RzLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSByZXdyaXRlTWFya2Rvd25MaW5rcyhcbiAgICBjb250ZW50OiBzdHJpbmcsXG4gICAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZyxcbiAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gICAgZGVzdGluYXRpb25NYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4sXG4gICk6IHN0cmluZyB7XG4gICAgbGV0IHJld3JpdHRlbiA9IGNvbnRlbnQucmVwbGFjZSgvKCEpP1xcW1xcWyhbXlxcXV0rKVxcXVxcXS9nLCAobWF0Y2gsIGVtYmVkUHJlZml4OiBzdHJpbmcgfCB1bmRlZmluZWQsIGlubmVyOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGFsaWFzU2VwYXJhdG9yID0gaW5uZXIuaW5kZXhPZihcInxcIik7XG4gICAgICBjb25zdCBsaW5rVGV4dCA9IGFsaWFzU2VwYXJhdG9yID49IDAgPyBpbm5lci5zbGljZSgwLCBhbGlhc1NlcGFyYXRvcikgOiBpbm5lcjtcbiAgICAgIGNvbnN0IGFsaWFzID0gYWxpYXNTZXBhcmF0b3IgPj0gMCA/IGlubmVyLnNsaWNlKGFsaWFzU2VwYXJhdG9yICsgMSkgOiBcIlwiO1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVSZWZlcmVuY2UobGlua1RleHQsIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFwcGVkUGF0aCA9IGRlc3RpbmF0aW9uTWFwLmdldChyZXNvbHZlZC50YXJnZXRGaWxlLnBhdGgpO1xuICAgICAgaWYgKCFtYXBwZWRQYXRoKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHRQYXRoID0gdGhpcy50b1dpa2lMaW5rUGF0aChkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBtYXBwZWRQYXRoLCByZXNvbHZlZC50YXJnZXRGaWxlLmV4dGVuc2lvbik7XG4gICAgICBjb25zdCByZWJ1aWx0ID0gYCR7bmV4dFBhdGh9JHtyZXNvbHZlZC5zdWJwYXRofSR7YWxpYXMgPyBgfCR7YWxpYXN9YCA6IFwiXCJ9YDtcbiAgICAgIHJldHVybiBgJHtlbWJlZFByZWZpeCA/PyBcIlwifVtbJHtyZWJ1aWx0fV1dYDtcbiAgICB9KTtcblxuICAgIHJld3JpdHRlbiA9IHJld3JpdHRlbi5yZXBsYWNlKC8oISk/XFxbKFteXFxdXSopXFxdXFwoKFteKV0rKVxcKS9nLCAobWF0Y2gsIGVtYmVkUHJlZml4OiBzdHJpbmcgfCB1bmRlZmluZWQsIGxhYmVsOiBzdHJpbmcsIHJhd0hyZWY6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgcGFyc2VkID0gdGhpcy5wYXJzZU1hcmtkb3duSHJlZihyYXdIcmVmKTtcbiAgICAgIGlmICghcGFyc2VkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUmVmZXJlbmNlKHBhcnNlZC5wYXRoLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hcHBlZFBhdGggPSBkZXN0aW5hdGlvbk1hcC5nZXQocmVzb2x2ZWQudGFyZ2V0RmlsZS5wYXRoKTtcbiAgICAgIGlmICghbWFwcGVkUGF0aCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCByZWxhdGl2ZUxpbmsgPSB0aGlzLnRvUmVsYXRpdmVMaW5rKGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGgsIG1hcHBlZFBhdGgpO1xuICAgICAgY29uc3QgcmVidWlsdEhyZWYgPSBgJHt0aGlzLmVuY29kZU1hcmtkb3duTGlua1BhdGgocmVsYXRpdmVMaW5rKX0ke3Jlc29sdmVkLnN1YnBhdGh9YDtcbiAgICAgIGNvbnN0IHdyYXBwZWRIcmVmID0gcGFyc2VkLndyYXBwZWRJbkFuZ2xlcyA/IGA8JHtyZWJ1aWx0SHJlZn0+YCA6IHJlYnVpbHRIcmVmO1xuICAgICAgcmV0dXJuIGAke2VtYmVkUHJlZml4ID8/IFwiXCJ9WyR7bGFiZWx9XSgke3dyYXBwZWRIcmVmfSlgO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJld3JpdHRlbjtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVJlZmVyZW5jZShsaW5rVGV4dDogc3RyaW5nLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nKTogeyB0YXJnZXRGaWxlOiBURmlsZTsgc3VicGF0aDogc3RyaW5nIH0gfCBudWxsIHtcbiAgICBjb25zdCBoYXNoSW5kZXggPSBsaW5rVGV4dC5pbmRleE9mKFwiI1wiKTtcbiAgICBjb25zdCByYXdQYXRoID0gaGFzaEluZGV4ID49IDAgPyBsaW5rVGV4dC5zbGljZSgwLCBoYXNoSW5kZXgpIDogbGlua1RleHQ7XG4gICAgY29uc3Qgc3VicGF0aCA9IGhhc2hJbmRleCA+PSAwID8gbGlua1RleHQuc2xpY2UoaGFzaEluZGV4KSA6IFwiXCI7XG4gICAgY29uc3QgZGVjb2RlZFBhdGggPSBkZWNvZGVVUklDb21wb25lbnQocmF3UGF0aC50cmltKCkpO1xuICAgIGlmIChkZWNvZGVkUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZ2V0TGlua3BhdGgoZGVjb2RlZFBhdGgpLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgaWYgKCF0YXJnZXRGaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHsgdGFyZ2V0RmlsZSwgc3VicGF0aCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hcmtkb3duSHJlZihyYXdIcmVmOiBzdHJpbmcpOiBQYXJzZWRNYXJrZG93bkhyZWYgfCBudWxsIHtcbiAgICBjb25zdCB0cmltbWVkID0gcmF3SHJlZi50cmltKCk7XG4gICAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aChcIiNcIikgfHwgL15bYS16XSs6L2kudGVzdCh0cmltbWVkKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHdyYXBwZWRJbkFuZ2xlcyA9IHRyaW1tZWQuc3RhcnRzV2l0aChcIjxcIikgJiYgdHJpbW1lZC5lbmRzV2l0aChcIj5cIikgJiYgdHJpbW1lZC5sZW5ndGggPiAyO1xuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiB3cmFwcGVkSW5BbmdsZXMgPyB0cmltbWVkLnNsaWNlKDEsIC0xKSA6IHRyaW1tZWQsXG4gICAgICB3cmFwcGVkSW5BbmdsZXMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdG9XaWtpTGlua1BhdGgoY3VycmVudERlc3RpbmF0aW9uOiBzdHJpbmcsIHRhcmdldERlc3RpbmF0aW9uOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWxhdGl2ZUxpbmsgPSB0aGlzLnRvUmVsYXRpdmVMaW5rKGN1cnJlbnREZXN0aW5hdGlvbiwgdGFyZ2V0RGVzdGluYXRpb24pO1xuICAgIHJldHVybiBleHRlbnNpb24udG9Mb3dlckNhc2UoKSA9PT0gXCJtZFwiID8gcmVsYXRpdmVMaW5rLnJlcGxhY2UoL1xcLm1kJC9pLCBcIlwiKSA6IHJlbGF0aXZlTGluaztcbiAgfVxuXG4gIHByaXZhdGUgdG9SZWxhdGl2ZUxpbmsoZnJvbUZpbGU6IHN0cmluZywgdG9GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbGF0aXZlID0gbm9ybWFsaXplUGF0aChwYXRoLnBvc2l4LnJlbGF0aXZlKHBhdGgucG9zaXguZGlybmFtZShmcm9tRmlsZSksIHRvRmlsZSkpO1xuICAgIHJldHVybiByZWxhdGl2ZS5sZW5ndGggPiAwID8gcmVsYXRpdmUgOiBwYXRoLnBvc2l4LmJhc2VuYW1lKHRvRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGVuY29kZU1hcmtkb3duTGlua1BhdGgobGlua1BhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVuY29kZVVSSShsaW5rUGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RGVzdGluYXRpb25UYWdzKGNvbnRlbnQ6IHN0cmluZywgbW9kZTogVHJhbnNmZXJNb2RlLCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gICAgY29uc3QgdGFncyA9IHRoaXMuZ2V0VGFnc0Zvck1vZGUobW9kZSk7XG4gICAgaWYgKHRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4geyBjb250ZW50IH07XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGNvbnRlbnQsIHRhZ3MpO1xuICAgIGlmIChyZXN1bHQud2FybmluZykge1xuICAgICAgcmV0dXJuIHsgY29udGVudCwgd2FybmluZzogYFNraXBwZWQgdGFnZ2luZyAke3NvdXJjZVBhdGh9OiAke3Jlc3VsdC53YXJuaW5nfWAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdGFnU291cmNlTWFya2Rvd24oZmlsZTogVEZpbGUsIHRhZ3M6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgaWYgKCFpc01hcmtkb3duRmlsZShmaWxlKSB8fCB0YWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRDb250ZW50ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hZGRUYWdzVG9NYXJrZG93bkNvbnRlbnQoY3VycmVudENvbnRlbnQsIHRhZ3MpO1xuICAgIGlmIChyZXN1bHQud2FybmluZykge1xuICAgICAgcmV0dXJuIGBTa2lwcGVkIHRhZ2dpbmcgc291cmNlIGZpbGUgJHtmaWxlLnBhdGh9OiAke3Jlc3VsdC53YXJuaW5nfWA7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuY29udGVudCAhPT0gY3VycmVudENvbnRlbnQpIHtcbiAgICAgIGNvbnN0IGZyb250bWF0dGVyUmFuZ2UgPSBjb2xsZWN0RnJvbnRtYXR0ZXJSYW5nZShjdXJyZW50Q29udGVudCk7XG4gICAgICBjb25zdCBmb3JtYXQgPSBmcm9udG1hdHRlclJhbmdlICYmIGZyb250bWF0dGVyUmFuZ2UgIT09IFwiaW52YWxpZFwiXG4gICAgICAgID8gZ2V0RXhpc3RpbmdUYWdGb3JtYXR0aW5nKGZyb250bWF0dGVyUmFuZ2UuYm9keSlcbiAgICAgICAgOiBcInVua25vd25cIjtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgICAgICBjb25zdCBtZXJnZWRUYWdzID0gam9pblRhZ1ZhbHVlcyhleHRyYWN0RXhpc3RpbmdUYWdzKGZyb250bWF0dGVyLnRhZ3MpLCB0YWdzKTtcbiAgICAgICAgICBpZiAobWVyZ2VkVGFncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGRlbGV0ZSBmcm9udG1hdHRlci50YWdzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChmb3JtYXQgPT09IFwiY29tbWFcIikge1xuICAgICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiwgXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZm9ybWF0ID09PSBcInNwYWNlXCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShmcm9udG1hdHRlci50YWdzKSB8fCBmb3JtYXQgPT09IFwiYXJyYXlcIikge1xuICAgICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3M7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZnJvbnRtYXR0ZXIudGFncyA9PT0gXCJzdHJpbmdcIiB8fCBmb3JtYXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMSA/IG1lcmdlZFRhZ3NbMF0gOiBtZXJnZWRUYWdzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5sZW5ndGggPT09IDEgPyBtZXJnZWRUYWdzWzBdIDogbWVyZ2VkVGFncztcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGBTa2lwcGVkIHRhZ2dpbmcgc291cmNlIGZpbGUgJHtmaWxlLnBhdGh9OiBpbnZhbGlkIGZyb250bWF0dGVyLmA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRUYWdzVG9NYXJrZG93bkNvbnRlbnQoY29udGVudDogc3RyaW5nLCB0YWdzOiBzdHJpbmdbXSk6IEZyb250bWF0dGVyVGFnUmVzdWx0IHtcbiAgICBjb25zdCBmcm9udG1hdHRlclJhbmdlID0gY29sbGVjdEZyb250bWF0dGVyUmFuZ2UoY29udGVudCk7XG4gICAgaWYgKGZyb250bWF0dGVyUmFuZ2UgPT09IFwiaW52YWxpZFwiKSB7XG4gICAgICByZXR1cm4geyBjb250ZW50LCB3YXJuaW5nOiBcImludmFsaWQgZnJvbnRtYXR0ZXIuXCIgfTtcbiAgICB9XG5cbiAgICBjb25zdCBidWlsZEZyb250bWF0dGVyID0gKGZyb250bWF0dGVyQm9keTogc3RyaW5nIHwgbnVsbCk6IEZyb250bWF0dGVyVGFnUmVzdWx0ID0+IHtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGZyb250bWF0dGVyQm9keSA/IGdldEV4aXN0aW5nVGFnRm9ybWF0dGluZyhmcm9udG1hdHRlckJvZHkpIDogXCJ1bmtub3duXCI7XG4gICAgICBsZXQgcGFyc2VkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFyc2VkID0gZnJvbnRtYXR0ZXJCb2R5ID8gKChwYXJzZVlhbWwoZnJvbnRtYXR0ZXJCb2R5KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPz8ge30pIDoge307XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIHsgY29udGVudCwgd2FybmluZzogXCJpbnZhbGlkIGZyb250bWF0dGVyLlwiIH07XG4gICAgICB9XG4gICAgICBjb25zdCBtZXJnZWRUYWdzID0gam9pblRhZ1ZhbHVlcyhleHRyYWN0RXhpc3RpbmdUYWdzKHBhcnNlZC50YWdzKSwgdGFncyk7XG4gICAgICBpZiAobWVyZ2VkVGFncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHsgY29udGVudCB9O1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGFyc2VkLnRhZ3MpKSB7XG4gICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncztcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhcnNlZC50YWdzID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGlmIChmb3JtYXQgPT09IFwiY29tbWFcIikge1xuICAgICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiLCBcIik7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0ID09PSBcInNwYWNlXCIpIHtcbiAgICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiBcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIgXCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3MubGVuZ3RoID09PSAxID8gbWVyZ2VkVGFnc1swXSA6IG1lcmdlZFRhZ3M7XG4gICAgICB9XG4gICAgICBjb25zdCB5YW1sQm9keSA9IHN0cmluZ2lmeVlhbWwocGFyc2VkKS50cmltRW5kKCk7XG4gICAgICBjb25zdCBuZXh0RnJvbnRtYXR0ZXIgPSBgLS0tXFxuJHt5YW1sQm9keX1cXG4tLS1cXG5gO1xuICAgICAgaWYgKCFmcm9udG1hdHRlclJhbmdlKSB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQ6IGAke25leHRGcm9udG1hdHRlcn0ke2NvbnRlbnR9YCB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogYCR7bmV4dEZyb250bWF0dGVyfSR7Y29udGVudC5zbGljZShmcm9udG1hdHRlclJhbmdlLnJhbmdlWzFdKX1gLFxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgaWYgKCFmcm9udG1hdHRlclJhbmdlKSB7XG4gICAgICByZXR1cm4gYnVpbGRGcm9udG1hdHRlcihudWxsKTtcbiAgICB9XG4gICAgcmV0dXJuIGJ1aWxkRnJvbnRtYXR0ZXIoZnJvbnRtYXR0ZXJSYW5nZS5ib2R5KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGFnc0Zvck1vZGUobW9kZTogVHJhbnNmZXJNb2RlKTogc3RyaW5nW10ge1xuICAgIHJldHVybiBjbGVhblRhZ0lucHV0KG1vZGUgPT09IFwiY29weVwiID8gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0ZvckNvcGllZEVsZW1lbnRzIDogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0Zvck1vdmVkRWxlbWVudHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBkZWxldGVNb3ZlZFNvdXJjZXModHJhbnNmZXJyZWRGaWxlczogVEZpbGVbXSwgc2VsZWN0ZWRGb2xkZXJQYXRoczogc3RyaW5nW10sIHN1bW1hcnk6IFRyYW5zZmVyU3VtbWFyeSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgdW5pcXVlRmlsZXMgPSBbLi4ubmV3IE1hcCh0cmFuc2ZlcnJlZEZpbGVzLm1hcCgoZmlsZSkgPT4gW2ZpbGUucGF0aCwgZmlsZV0pKS52YWx1ZXMoKV0uc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0LnBhdGgubGVuZ3RoIC0gbGVmdC5wYXRoLmxlbmd0aCk7XG4gICAgbGV0IGRlbGV0ZWRDb3VudCA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdW5pcXVlRmlsZXMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoZmlsZS5wYXRoKTtcbiAgICAgICAgaWYgKCFjdXJyZW50RmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC5maWxlTWFuYWdlci50cmFzaEZpbGUoY3VycmVudEZpbGUpO1xuICAgICAgICBkZWxldGVkQ291bnQgKz0gMTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHN1bW1hcnkuZmFpbGVkQ291bnQgKz0gMTtcbiAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBGYWlsZWQgdG8gZGVsZXRlIHNvdXJjZSBmaWxlICR7ZmlsZS5wYXRofTogJHt0aGlzLnRvRXJyb3JNZXNzYWdlKGVycm9yLCBcIkNvdWxkIG5vdCBkZWxldGUgc291cmNlIGZpbGUuXCIpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNvcnRlZEZvbGRlcnMgPSBbLi4uc2VsZWN0ZWRGb2xkZXJQYXRoc10uc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0Lmxlbmd0aCAtIGxlZnQubGVuZ3RoKTtcbiAgICBmb3IgKGNvbnN0IGZvbGRlclBhdGggb2Ygc29ydGVkRm9sZGVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZvbGRlckJ5UGF0aChmb2xkZXJQYXRoKTtcbiAgICAgICAgaWYgKCFmb2xkZXIgfHwgZm9sZGVyLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAuZmlsZU1hbmFnZXIudHJhc2hGaWxlKGZvbGRlcik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goYEZhaWxlZCB0byBkZWxldGUgc291cmNlIGZvbGRlciAke2ZvbGRlclBhdGh9OiAke3RoaXMudG9FcnJvck1lc3NhZ2UoZXJyb3IsIFwiQ291bGQgbm90IGRlbGV0ZSBzb3VyY2UgZm9sZGVyLlwiKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVsZXRlZENvdW50O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwYXRoRXhpc3RzKGNhbmRpZGF0ZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmcy5hY2Nlc3MoY2FuZGlkYXRlUGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZpbmRBdmFpbGFibGVQYXRoKGNhbmRpZGF0ZVBhdGg6IHN0cmluZywgcmVzZXJ2ZWRQYXRoczogU2V0PHN0cmluZz4sIHNvdXJjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgcGFyc2VkID0gcGF0aC5wYXJzZShjYW5kaWRhdGVQYXRoKTtcbiAgICBsZXQgaW5kZXggPSAxO1xuICAgIGxldCBuZXh0UGF0aCA9IGNhbmRpZGF0ZVBhdGg7XG4gICAgd2hpbGUgKHJlc2VydmVkUGF0aHMuaGFzKG5leHRQYXRoKSB8fCBhd2FpdCB0aGlzLnBhdGhFeGlzdHMobmV4dFBhdGgpIHx8IG5leHRQYXRoID09PSBzb3VyY2VQYXRoKSB7XG4gICAgICBuZXh0UGF0aCA9IHBhdGguam9pbihwYXJzZWQuZGlyLCBgJHtwYXJzZWQubmFtZX0gJHtpbmRleH0ke3BhcnNlZC5leHR9YCk7XG4gICAgICBpbmRleCArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gbmV4dFBhdGg7XG4gIH1cblxuICBwcml2YXRlIHRvRXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duLCBmYWxsYmFjazogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBmYWxsYmFjaztcbiAgfVxufVxuXG5jbGFzcyBUYXJnZXRWYXVsdFN1Z2dlc3RNb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPERlc3RpbmF0aW9uQ29uZmlnPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0czogRGVzdGluYXRpb25Db25maWdbXSxcbiAgICBwbGFjZWhvbGRlcjogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25DaG9vc2VUYXJnZXQ6ICh0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKSA9PiB2b2lkLFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuc2V0UGxhY2Vob2xkZXIocGxhY2Vob2xkZXIpO1xuICAgIHRoaXMuZW1wdHlTdGF0ZVRleHQgPSBcIk5vIGRlc3RpbmF0aW9uIHZhdWx0cyBhdmFpbGFibGUuXCI7XG4gIH1cblxuICBnZXRJdGVtcygpOiBEZXN0aW5hdGlvbkNvbmZpZ1tdIHtcbiAgICByZXR1cm4gdGhpcy50YXJnZXRzO1xuICB9XG5cbiAgZ2V0SXRlbVRleHQodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0KTtcbiAgfVxuXG4gIHJlbmRlclN1Z2dlc3Rpb24obWF0Y2g6IEZ1enp5TWF0Y2g8RGVzdGluYXRpb25Db25maWc+LCBlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCB0YXJnZXQgPSBtYXRjaC5pdGVtO1xuICAgIGVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXN1Z2dlc3QtdGl0bGVcIiwgdGV4dDogZ2V0RGVzdGluYXRpb25EaXNwbGF5TmFtZSh0YXJnZXQpIH0pO1xuICAgIGNvbnN0IGRldGFpbCA9IFt0YXJnZXQudmF1bHRQYXRoLnRyaW0oKSwgdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aC50cmltKCldLmZpbHRlcigoZW50cnkpID0+IGVudHJ5Lmxlbmd0aCA+IDApLmpvaW4oXCIgLT4gXCIpO1xuICAgIGlmIChkZXRhaWwubGVuZ3RoID4gMCkge1xuICAgICAgZWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtc3VnZ2VzdC1kZXRhaWxcIiwgdGV4dDogZGV0YWlsIH0pO1xuICAgIH1cbiAgfVxuXG4gIG9uQ2hvb3NlSXRlbSh0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogdm9pZCB7XG4gICAgdGhpcy5vbkNob29zZVRhcmdldCh0YXJnZXQpO1xuICB9XG59XG5cbmNsYXNzIFJldmlld1NlbGVjdGlvbk1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IHNlbGVjdGlvblN0YXRlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgbm9kZUVsZW1lbnRzID0gbmV3IE1hcDxzdHJpbmcsIEhUTUxJbnB1dEVsZW1lbnQ+KCk7XG4gIHByaXZhdGUgcmVzb2x2ZVByb21pc2U6ICgocmVzdWx0OiBSZXZpZXdNb2RhbFJlc3VsdCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJvb3RzOiBSZXZpZXdOb2RlW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb25mbGljdFN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5LFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIGZvciAoY29uc3Qgcm9vdCBvZiByb290cykge1xuICAgICAgdGhpcy5pbml0aWFsaXplTm9kZVN0YXRlKHJvb3QpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHdhaXRGb3JSZXN1bHQoKTogUHJvbWlzZTxSZXZpZXdNb2RhbFJlc3VsdD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxSZXZpZXdNb2RhbFJlc3VsdD4oKHJlc29sdmUpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfSk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy5tb2RhbEVsLmFkZENsYXNzKFwidHJhbnN2YXVsdC1yZXZpZXctbW9kYWxcIik7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJSZXZpZXcgbGlua2VkIG5vdGVzXCIpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3QgY29uZmxpY3ROb3RpY2UgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1yZXZpZXctY29uZmxpY3Qtbm90aWNlXCIgfSk7XG4gICAgY29uZmxpY3ROb3RpY2UuY3JlYXRlU3Bhbih7XG4gICAgICBjbHM6IFwidHJhbnN2YXVsdC1yZXZpZXctY29uZmxpY3QtYmFkZ2VcIixcbiAgICAgIHRleHQ6IGBDb25mbGljdCBoYW5kbGluZzogJHtnZXRDb25mbGljdFN0cmF0ZWd5TGFiZWwodGhpcy5jb25mbGljdFN0cmF0ZWd5KX1gLFxuICAgIH0pO1xuICAgIGNvbmZsaWN0Tm90aWNlLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICBjbHM6IFwidHJhbnN2YXVsdC1yZXZpZXctY29uZmxpY3QtdGV4dFwiLFxuICAgICAgdGV4dDogZ2V0Q29uZmxpY3RTdHJhdGVneURlc2NyaXB0aW9uKHRoaXMuY29uZmxpY3RTdHJhdGVneSksXG4gICAgfSk7XG4gICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiUmV2aWV3IGRpcmVjdCBsaW5rcyBhbmQgYmFja2xpbmtzIGZvciB0aGUgc2VsZWN0ZWQgTWFya2Rvd24gbm90ZXMuIFRoZSB0cmFuc2ZlciBpbmNsdWRlcyBldmVyeSBub3RlIGluc3RhbmNlIHRoYXQgcmVtYWlucyBzZWxlY3RlZC5cIixcbiAgICB9KTtcbiAgICBjb25zdCB0cmVlID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LXRyZWVcIiB9KTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgdGhpcy5yb290cykge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKHRyZWUsIHJvb3QsIDApO1xuICAgIH1cbiAgICBjb25zdCBhY3Rpb25zID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcIm1vZGFsLWJ1dHRvbi1jb250YWluZXJcIiB9KTtcbiAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcbiAgICBjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIHRoaXMuZmluaXNoKHsgY29uZmlybWVkOiBmYWxzZSwgc2VsZWN0ZWRQYXRoczogW10gfSk7XG4gICAgfSk7XG4gICAgY29uc3QgY29uZmlybUJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlRyYW5zZmVyIHNlbGVjdGVkIGl0ZW1zXCIgfSk7XG4gICAgY29uZmlybUJ1dHRvbi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XG4gICAgY29uZmlybUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5maW5pc2goe1xuICAgICAgICBjb25maXJtZWQ6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkUGF0aHM6IFsuLi50aGlzLmdldFNlbGVjdGVkUGF0aHMoKV0uc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlc29sdmVQcm9taXNlKSB7XG4gICAgICB0aGlzLmZpbmlzaCh7IGNvbmZpcm1lZDogZmFsc2UsIHNlbGVjdGVkUGF0aHM6IFtdIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZmluaXNoKHJlc3VsdDogUmV2aWV3TW9kYWxSZXN1bHQpOiB2b2lkIHtcbiAgICBjb25zdCByZXNvbHZlID0gdGhpcy5yZXNvbHZlUHJvbWlzZTtcbiAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgcmVzb2x2ZT8uKHJlc3VsdCk7XG4gIH1cblxuICBwcml2YXRlIGluaXRpYWxpemVOb2RlU3RhdGUobm9kZTogUmV2aWV3Tm9kZSk6IHZvaWQge1xuICAgIGlmIChub2RlLnR5cGUgPT09IFwibm90ZVwiIHx8IG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uU3RhdGUuc2V0KG5vZGUuaWQsIHRydWUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU5vZGVTdGF0ZShjaGlsZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJOb2RlKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgbm9kZTogUmV2aWV3Tm9kZSwgZGVwdGg6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGl0ZW0gPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1yZXZpZXctbm9kZVwiIH0pO1xuICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoXCItLXRyYW5zdmF1bHQtZGVwdGhcIiwgU3RyaW5nKGRlcHRoKSk7XG4gICAgY29uc3Qgcm93ID0gaXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1yZXZpZXctcm93XCIgfSk7XG4gICAgcm93LmFkZENsYXNzKGB0cmFuc3ZhdWx0LXJldmlldy1yb3ctJHtub2RlLnR5cGV9YCk7XG4gICAgY29uc3QgY2hlY2tib3hTaGVsbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zdmF1bHQtY2hlY2tib3gtc2hlbGxcIiB9KTtcbiAgICBjb25zdCBjaGVja2JveCA9IGNoZWNrYm94U2hlbGwuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwiY2hlY2tib3hcIiB9KTtcbiAgICB0aGlzLm5vZGVFbGVtZW50cy5zZXQobm9kZS5pZCwgY2hlY2tib3gpO1xuICAgIGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuICAgICAgdGhpcy50b2dnbGVOb2RlKG5vZGUsIGNoZWNrYm94LmNoZWNrZWQpO1xuICAgICAgdGhpcy5yZWZyZXNoVHJlZSgpO1xuICAgIH0pO1xuICAgIGNvbnN0IGluZGljYXRvciA9IGNoZWNrYm94U2hlbGwuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LWNoZWNrLWluZGljYXRvclwiIH0pO1xuICAgIGNvbnN0IGljb25FbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWljb25cIiB9KTtcbiAgICBpZiAobm9kZS50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIGlmIChub2RlLmRpcmVjdGlvbikge1xuICAgICAgICBzZXRJY29uKGljb25FbCwgbm9kZS5kaXJlY3Rpb24gPT09IFwidG9cIiA/IFwibGlua3MtZ29pbmctb3V0XCIgOiBcImxpbmtzLWNvbWluZy1pblwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldEljb24oaWNvbkVsLCBcInBhcGVyY2xpcFwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpIHtcbiAgICAgIHNldEljb24oaWNvbkVsLCBcInBhcGVyY2xpcFwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0SWNvbihpY29uRWwsIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCA/IFwiZmlsZS10ZXh0XCIgOiBcImZpbGVcIik7XG4gICAgfVxuICAgIGNvbnN0IGxhYmVsID0gcm93LmNyZWF0ZVNwYW4oeyBjbHM6IFwidHJhbnN2YXVsdC1yZXZpZXctbGFiZWxcIiwgdGV4dDogbm9kZS5sYWJlbCB9KTtcbiAgICBsYWJlbC5hZGRDbGFzcyhgdHJhbnN2YXVsdC1yZXZpZXctbGFiZWwtJHtub2RlLnR5cGV9YCk7XG5cbiAgICBjb25zdCBjaGlsZHJlbkNvbnRhaW5lciA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNoaWxkcmVuXCIgfSk7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLnJlbmRlck5vZGUoY2hpbGRyZW5Db250YWluZXIsIGNoaWxkLCBkZXB0aCArIDEpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZUNoZWNrYm94KG5vZGUsIGNoZWNrYm94LCBpbmRpY2F0b3IpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoVHJlZSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2YgdGhpcy5yb290cykge1xuICAgICAgdGhpcy5yZWZyZXNoTm9kZShyb290KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2hOb2RlKG5vZGU6IFJldmlld05vZGUpOiB2b2lkIHtcbiAgICBjb25zdCBjaGVja2JveCA9IHRoaXMubm9kZUVsZW1lbnRzLmdldChub2RlLmlkKTtcbiAgICBpZiAoY2hlY2tib3gpIHtcbiAgICAgIGNvbnN0IGluZGljYXRvciA9IGNoZWNrYm94LnBhcmVudEVsZW1lbnQ/LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KFwiLnRyYW5zdmF1bHQtY2hlY2staW5kaWNhdG9yXCIpID8/IG51bGw7XG4gICAgICBpZiAoaW5kaWNhdG9yKSB7XG4gICAgICAgIHRoaXMudXBkYXRlQ2hlY2tib3gobm9kZSwgY2hlY2tib3gsIGluZGljYXRvcik7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy5yZWZyZXNoTm9kZShjaGlsZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVDaGVja2JveChub2RlOiBSZXZpZXdOb2RlLCBjaGVja2JveDogSFRNTElucHV0RWxlbWVudCwgaW5kaWNhdG9yOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5nZXROb2RlU3RhdHVzKG5vZGUpO1xuICAgIGNoZWNrYm94LmNoZWNrZWQgPSBzdGF0ZSA9PT0gXCJjaGVja2VkXCI7XG4gICAgY2hlY2tib3guaW5kZXRlcm1pbmF0ZSA9IHN0YXRlID09PSBcIm1peGVkXCI7XG4gICAgaW5kaWNhdG9yLnRleHRDb250ZW50ID0gc3RhdGUgPT09IFwibWl4ZWRcIiA/IFwiLVwiIDogXCJcIjtcbiAgICBpbmRpY2F0b3IudG9nZ2xlQ2xhc3MoXCJpcy12aXNpYmxlXCIsIHN0YXRlID09PSBcIm1peGVkXCIpO1xuICAgIGNoZWNrYm94LmRhdGFzZXQuc3RhdGUgPSBzdGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Tm9kZVN0YXR1cyhub2RlOiBSZXZpZXdOb2RlKTogXCJjaGVja2VkXCIgfCBcInVuY2hlY2tlZFwiIHwgXCJtaXhlZFwiIHtcbiAgICBpZiAobm9kZS50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbWJpbmVTdGF0dXNlcyhub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQpID0+IHRoaXMuZ2V0Tm9kZVN0YXR1cyhjaGlsZCkpKTtcbiAgICB9XG4gICAgY29uc3Qgc2VsZlNlbGVjdGVkID0gdGhpcy5zZWxlY3Rpb25TdGF0ZS5nZXQobm9kZS5pZCkgPz8gZmFsc2U7XG4gICAgaWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2VsZlNlbGVjdGVkID8gXCJjaGVja2VkXCIgOiBcInVuY2hlY2tlZFwiO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZFN0YXR1cyA9IHRoaXMuY29tYmluZVN0YXR1c2VzKG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZCkgPT4gdGhpcy5nZXROb2RlU3RhdHVzKGNoaWxkKSkpO1xuICAgIGlmIChzZWxmU2VsZWN0ZWQgJiYgY2hpbGRTdGF0dXMgPT09IFwiY2hlY2tlZFwiKSB7XG4gICAgICByZXR1cm4gXCJjaGVja2VkXCI7XG4gICAgfVxuICAgIGlmICghc2VsZlNlbGVjdGVkICYmIGNoaWxkU3RhdHVzID09PSBcInVuY2hlY2tlZFwiKSB7XG4gICAgICByZXR1cm4gXCJ1bmNoZWNrZWRcIjtcbiAgICB9XG4gICAgcmV0dXJuIFwibWl4ZWRcIjtcbiAgfVxuXG4gIHByaXZhdGUgY29tYmluZVN0YXR1c2VzKHN0YXR1c2VzOiBBcnJheTxcImNoZWNrZWRcIiB8IFwidW5jaGVja2VkXCIgfCBcIm1peGVkXCI+KTogXCJjaGVja2VkXCIgfCBcInVuY2hlY2tlZFwiIHwgXCJtaXhlZFwiIHtcbiAgICBpZiAoc3RhdHVzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gXCJ1bmNoZWNrZWRcIjtcbiAgICB9XG4gICAgaWYgKHN0YXR1c2VzLmV2ZXJ5KChzdGF0dXMpID0+IHN0YXR1cyA9PT0gXCJjaGVja2VkXCIpKSB7XG4gICAgICByZXR1cm4gXCJjaGVja2VkXCI7XG4gICAgfVxuICAgIGlmIChzdGF0dXNlcy5ldmVyeSgoc3RhdHVzKSA9PiBzdGF0dXMgPT09IFwidW5jaGVja2VkXCIpKSB7XG4gICAgICByZXR1cm4gXCJ1bmNoZWNrZWRcIjtcbiAgICB9XG4gICAgcmV0dXJuIFwibWl4ZWRcIjtcbiAgfVxuXG4gIHByaXZhdGUgdG9nZ2xlTm9kZShub2RlOiBSZXZpZXdOb2RlLCBjaGVja2VkOiBib29sZWFuKTogdm9pZCB7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJub3RlXCIgfHwgbm9kZS50eXBlID09PSBcImF0dGFjaG1lbnRcIikge1xuICAgICAgdGhpcy5zZWxlY3Rpb25TdGF0ZS5zZXQobm9kZS5pZCwgY2hlY2tlZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy50b2dnbGVOb2RlKGNoaWxkLCBjaGVja2VkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGVkUGF0aHMoKTogU2V0PHN0cmluZz4ge1xuICAgIGNvbnN0IHNlbGVjdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMuY29sbGVjdFNlbGVjdGVkUGF0aHMocm9vdCwgc2VsZWN0ZWQpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZWN0ZWQ7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RTZWxlY3RlZFBhdGhzKG5vZGU6IFJldmlld05vZGUsIHNpbms6IFNldDxzdHJpbmc+KTogdm9pZCB7XG4gICAgaWYgKChub2RlLnR5cGUgPT09IFwibm90ZVwiIHx8IG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpICYmIG5vZGUuZmlsZVBhdGggJiYgKHRoaXMuc2VsZWN0aW9uU3RhdGUuZ2V0KG5vZGUuaWQpID8/IGZhbHNlKSkge1xuICAgICAgc2luay5hZGQobm9kZS5maWxlUGF0aCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy5jb2xsZWN0U2VsZWN0ZWRQYXRocyhjaGlsZCwgc2luayk7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFRyYW5zVmF1bHRTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogVHJhbnNWYXVsdFBsdWdpbiwgcHJpdmF0ZSByZWFkb25seSBkZXN0aW5hdGlvblJlc29sdmVyOiBEZXN0aW5hdGlvblJlc29sdmVyKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiUmVsZWFzZSBub3Rlc1wiKVxuICAgICAgLnNldERlc2MoXCJSZWFkIHdoYXQgY2hhbmdlZCBpbiB0aGlzIHZlcnNpb24uXCIpXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTaG93IHJlbGVhc2Ugbm90ZXNcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgbmV3IFJlbGVhc2VOb3Rlc01vZGFsKHRoaXMuYXBwKS5vcGVuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImJyXCIpO1xuXG4gICAgdGhpcy5hZGREcm9wZG93blNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiQ29uZmxpY3QgaGFuZGxpbmdcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGV0aGVyIGV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIGFyZSBza2lwcGVkLCByZW5hbWVkIGF1dG9tYXRpY2FsbHksIG9yIG92ZXJ3cml0dGVuLlwiLFxuICAgICAgb3B0aW9uczogKE9iamVjdC5lbnRyaWVzKENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBKSBhcyBBcnJheTxbQ29uZmxpY3RTdHJhdGVneSwgdHlwZW9mIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW0NvbmZsaWN0U3RyYXRlZ3ldXT4pXG4gICAgICAgIC5tYXAoKFt2YWx1ZSwgbWV0YV0pID0+ICh7IHZhbHVlLCBsYWJlbDogbWV0YS5sYWJlbCB9KSksXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRvZ2dsZVNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiSW5jbHVkZSBsaW5rZWQgZmlsZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgZGlyZWN0bHkgcmVsYXRlZCBub3RlcyBhbmQgbGlua2VkIG5vbi1NYXJrZG93biBmaWxlcyBmcm9tIHNlbGVjdGVkIG5vdGVzLlwiLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5jbHVkZUxpbmtlZEZpbGVzID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkRHJvcGRvd25TZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlJldmlldyBkaWFsb2dcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGVuIHRvIHNob3cgdGhlIHRyYW5zZmVyIHJldmlldyBkaWFsb2cuXCIsXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHsgdmFsdWU6IFwiYWx3YXlzXCIsIGxhYmVsOiBcIkFsd2F5c1wiIH0sXG4gICAgICAgIHsgdmFsdWU6IFwibGlua2VkLW9ubHlcIiwgbGFiZWw6IFwiT25seSB3aGVuIG5vdGVzIGFyZSBsaW5rZWRcIiB9LFxuICAgICAgICB7IHZhbHVlOiBcIm5ldmVyXCIsIGxhYmVsOiBcIk5ldmVyXCIgfSxcbiAgICAgIF0sXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlRhZ3MgZm9yIGNvcGllZCBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBjb3B5aW5nLlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IFwiY29waWVkLCBzZW50XCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0ZvckNvcGllZEVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yQ29waWVkRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIkFsc28gdGFnIGNvcGllZCBzb3VyY2Ugbm90ZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIldyaXRlIHRoZSBjb25maWd1cmVkIGNvcHkgdGFncyBiYWNrIGludG8gc291cmNlIE1hcmtkb3duIGZpbGVzIGluIHRoZSBhY3RpdmUgdmF1bHQuXCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJUYWdzIGZvciBtb3ZlZCBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBtb3ZpbmcuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogXCJtb3ZlZCwgYXJjaGl2ZWRcIixcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yTW92ZWRFbGVtZW50cyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0Zvck1vdmVkRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJEZXN0aW5hdGlvbiB2YXVsdHNcIikuc2V0SGVhZGluZygpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlVzZSBhYnNvbHV0ZSBwYXRocy4gRGVzdGluYXRpb24gYW5kIGF0dGFjaG1lbnQgcGF0aHMgbXVzdCBzdGF5IGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQgcm9vdC5cIixcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMpIHtcbiAgICAgIHRoaXMucmVuZGVyRGVzdGluYXRpb25DYXJkKGNvbnRhaW5lckVsLCB0YXJnZXQpO1xuICAgIH1cblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBZGQgZGVzdGluYXRpb25cIilcbiAgICAgIC5zZXREZXNjKFwiQ3JlYXRlIGFub3RoZXIgZGVzdGluYXRpb24gdmF1bHQgY29uZmlndXJhdGlvbi5cIilcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkFkZCBkZXN0aW5hdGlvblwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRzLnB1c2goY3JlYXRlQmxhbmtEZXN0aW5hdGlvbigpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRGVzdGluYXRpb25DYXJkKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC10YXJnZXQtY2FyZFwiIH0pO1xuICAgIGNvbnN0IHZhbGlkYXRpb25Ib3N0ID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC10YXJnZXQtdmFsaWRhdGlvblwiIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjYXJkLCB7XG4gICAgICBuYW1lOiBcIkRlc3RpbmF0aW9uIG5hbWVcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkxhYmVsIHNob3duIGluIGRlc3RpbmF0aW9uIHNlbGVjdGlvbiBtZW51cy5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiBnZXREZXN0aW5hdGlvbkRpc3BsYXlOYW1lKHRhcmdldCksXG4gICAgICB2YWx1ZTogdGFyZ2V0Lm5hbWUsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC5uYW1lID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiRGVzdGluYXRpb24gdmF1bHQgcGF0aFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBvZiB0aGUgZGVzdGluYXRpb24gdmF1bHQuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0XCIpLFxuICAgICAgdmFsdWU6IHRhcmdldC52YXVsdFBhdGgsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC52YXVsdFBhdGggPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIGlmICh0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRGV0ZWN0ZWRBdHRhY2htZW50UGF0aCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY2FyZCwge1xuICAgICAgbmFtZTogXCJEZXN0aW5hdGlvbiBwYXRoXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJBYnNvbHV0ZSBwYXRoIGluc2lkZSB0aGUgZGVzdGluYXRpb24gdmF1bHQgd2hlcmUgY29waWVkIGFuZCBtb3ZlZCBjb250ZW50IHdpbGwgbGFuZC5cIixcbiAgICAgIHBsYWNlaG9sZGVyOiB0aGlzLmV4YW1wbGVQYXRoKFwiVmF1bHQvSW5ib3hcIiksXG4gICAgICB2YWx1ZTogdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGFyZ2V0LmRlc3RpbmF0aW9uUGF0aCA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiVXNlIGRlZmF1bHQgYXR0YWNobWVudCBsb2NhdGlvblwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiUmVhZCB0aGUgZGVzdGluYXRpb24gdmF1bHQgY29uZmlndXJhdGlvbiBhbmQgcmVzb2x2ZSB0aGUgYXR0YWNobWVudCBmb2xkZXIgYXV0b21hdGljYWxseS5cIixcbiAgICAgIHZhbHVlOiB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbixcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24gPSB2YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVEZXRlY3RlZEF0dGFjaG1lbnRQYXRoKHRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVkaXNwbGF5KCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKCF0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjYXJkLCB7XG4gICAgICAgIG5hbWU6IFwiQXR0YWNobWVudCBwYXRoXCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkFic29sdXRlIHBhdGggaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdCBmb3IgbGlua2VkIG5vbi1NYXJrZG93biBmaWxlcy5cIixcbiAgICAgICAgcGxhY2Vob2xkZXI6IHRoaXMuZXhhbXBsZVBhdGgoXCJWYXVsdC9BdHRhY2htZW50c1wiKSxcbiAgICAgICAgdmFsdWU6IHRhcmdldC5hdHRhY2htZW50UGF0aCxcbiAgICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRhcmdldC5hdHRhY2htZW50UGF0aCA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcblxuICAgIG5ldyBTZXR0aW5nKGNhcmQpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlJlbW92ZVwiKS5zZXRXYXJuaW5nKCkub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXJnZXRzLmZpbHRlcigoZW50cnkpID0+IGVudHJ5LmlkICE9PSB0YXJnZXQuaWQpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWRpc3BsYXkoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRUZXh0U2V0dGluZyhcbiAgICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgICAgcGxhY2Vob2xkZXI6IHN0cmluZztcbiAgICAgIHZhbHVlOiBzdHJpbmc7XG4gICAgICBvbkNoYW5nZTogKHZhbHVlOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XG4gICAgfSxcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShjb25maWcubmFtZSlcbiAgICAgIC5zZXREZXNjKGNvbmZpZy5kZXNjcmlwdGlvbilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoY29uZmlnLnBsYWNlaG9sZGVyKS5zZXRWYWx1ZShjb25maWcudmFsdWUpLm9uQ2hhbmdlKGNvbmZpZy5vbkNoYW5nZSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVG9nZ2xlU2V0dGluZyhcbiAgICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgICAgdmFsdWU6IGJvb2xlYW47XG4gICAgICBvbkNoYW5nZTogKHZhbHVlOiBib29sZWFuKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIH0sXG4gICk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoY29uZmlnLm5hbWUpXG4gICAgICAuc2V0RGVzYyhjb25maWcuZGVzY3JpcHRpb24pXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKGNvbmZpZy52YWx1ZSkub25DaGFuZ2UoY29uZmlnLm9uQ2hhbmdlKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGREcm9wZG93blNldHRpbmc8VCBleHRlbmRzIHN0cmluZz4oXG4gICAgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxuICAgIGNvbmZpZzoge1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICAgIG9wdGlvbnM6IEFycmF5PHsgdmFsdWU6IFQ7IGxhYmVsOiBzdHJpbmcgfT47XG4gICAgICB2YWx1ZTogVDtcbiAgICAgIG9uQ2hhbmdlOiAodmFsdWU6IFQpID0+IFByb21pc2U8dm9pZD47XG4gICAgfSxcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShjb25maWcubmFtZSlcbiAgICAgIC5zZXREZXNjKGNvbmZpZy5kZXNjcmlwdGlvbilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgY29uZmlnLm9wdGlvbnMpIHtcbiAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24ob3B0aW9uLnZhbHVlLCBvcHRpb24ubGFiZWwpO1xuICAgICAgICB9XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy52YWx1ZSkub25DaGFuZ2UoKHZhbHVlKSA9PiBjb25maWcub25DaGFuZ2UodmFsdWUgYXMgVCkpO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVBbmRSZWRpc3BsYXkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbihjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb24oY29udGFpbmVyRWwsIHRhcmdldCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclZhbGlkYXRpb24oY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCB0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb25zdCBlcnJvcnMgPSB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIudmFsaWRhdGUodGFyZ2V0KTtcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uICYmIHRhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogYERldGVjdGVkIGF0dGFjaG1lbnQgcGF0aDogJHt0YXJnZXQuYXR0YWNobWVudFBhdGgudHJpbSgpfWAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXJyb3Igb2YgZXJyb3JzKSB7XG4gICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogZXJyb3IgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVEZXRlY3RlZEF0dGFjaG1lbnRQYXRoKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBub3JtYWxpemVkVmF1bHRQYXRoID0gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh0YXJnZXQudmF1bHRQYXRoKTtcbiAgICBpZiAoIXBhdGguaXNBYnNvbHV0ZShub3JtYWxpemVkVmF1bHRQYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0YXJnZXQuYXR0YWNobWVudFBhdGggPSBhd2FpdCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIucmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aChub3JtYWxpemVkVmF1bHRQYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhhbXBsZVBhdGgoc3VmZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIgPyBgQzpcXFxcJHtzdWZmaXgucmVwbGFjZSgvXFwvL2csIFwiXFxcXFwiKX1gIDogYC9Vc2Vycy9leGFtcGxlLyR7c3VmZml4LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpfWA7XG4gIH1cbn1cblxuY2xhc3MgUmVsZWFzZU5vdGVzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXIgPSBuZXcgQ29tcG9uZW50KCk7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiUmVsZWFzZSBub3Rlc1wiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIHZvaWQgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIHJlbGVhc2VOb3RlcywgdGhpcy5jb250ZW50RWwsIFwiUkVMRUFTRU5PVEVTLm1kXCIsIHRoaXMucmVuZGVyZXIpO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnJlbmRlcmVyLnVubG9hZCgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhbnNWYXVsdFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBUcmFuc1ZhdWx0U2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlYWRvbmx5IGRlc3RpbmF0aW9uUmVzb2x2ZXIgPSBuZXcgRGVzdGluYXRpb25SZXNvbHZlcih0aGlzLmFwcC52YXVsdC5jb25maWdEaXIpO1xuICBwcml2YXRlIHBsYW5uZXIgPSBuZXcgVHJhbnNmZXJQbGFubmVyKHRoaXMsIHRoaXMuZGVzdGluYXRpb25SZXNvbHZlcik7XG4gIHByaXZhdGUgZXhlY3V0b3IgPSBuZXcgVHJhbnNmZXJFeGVjdXRvcih0aGlzKTtcbiAgcHJpdmF0ZSBub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IGZhbHNlO1xuICBwcml2YXRlIG5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCFQbGF0Zm9ybS5pc0Rlc2t0b3BBcHApIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJUcmFucyBWYXVsdCBpcyBhdmFpbGFibGUgb25seSBvbiBkZXNrdG9wLlwiLCAxMDAwMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFRyYW5zVmF1bHRTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzLCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIpKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tbWFuZHMoKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29udGV4dE1lbnVzKCk7XG4gICAgdGhpcy5yZWdpc3Rlck5vdGVib29rTmF2aWdhdG9ySW50ZWdyYXRpb24oKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzdG9yZWQgPSAoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSBhcyAoUGFydGlhbDxUcmFuc1ZhdWx0U2V0dGluZ3M+ICYgeyBzaG93UmV2aWV3RGlhbG9nPzogYm9vbGVhbiB9KSB8IG51bGw7XG4gICAgY29uc3QgbWlncmF0ZWRSZXZpZXdEaWFsb2dNb2RlOiBSZXZpZXdEaWFsb2dNb2RlIHwgdW5kZWZpbmVkID0gc3RvcmVkPy5yZXZpZXdEaWFsb2dNb2RlXG4gICAgICA/PyAodHlwZW9mIHN0b3JlZD8uc2hvd1Jldmlld0RpYWxvZyA9PT0gXCJib29sZWFuXCJcbiAgICAgICAgPyAoc3RvcmVkLnNob3dSZXZpZXdEaWFsb2cgPyBcImxpbmtlZC1vbmx5XCIgOiBcIm5ldmVyXCIpXG4gICAgICAgIDogdW5kZWZpbmVkKTtcbiAgICB0aGlzLnNldHRpbmdzID0ge1xuICAgICAgLi4uREVGQVVMVF9TRVRUSU5HUyxcbiAgICAgIC4uLnN0b3JlZCxcbiAgICAgIHJldmlld0RpYWxvZ01vZGU6IG1pZ3JhdGVkUmV2aWV3RGlhbG9nTW9kZSA/PyBERUZBVUxUX1NFVFRJTkdTLnJldmlld0RpYWxvZ01vZGUsXG4gICAgICB0YXJnZXRzOiAoc3RvcmVkPy50YXJnZXRzID8/IFtdKS5tYXAoKHRhcmdldCkgPT4ge1xuICAgICAgICBjb25zdCBtaWdyYXRlZFRhcmdldCA9IHtcbiAgICAgICAgICAuLi5jcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCksXG4gICAgICAgICAgLi4udGFyZ2V0LFxuICAgICAgICAgIGlkOiB0YXJnZXQuaWQgPz8gY3JlYXRlRGVzdGluYXRpb25JZCgpLFxuICAgICAgICB9O1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uICE9PSBcImJvb2xlYW5cIiAmJiAhdGFyZ2V0LmF0dGFjaG1lbnRQYXRoPy50cmltKCkpIHtcbiAgICAgICAgICBtaWdyYXRlZFRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWlncmF0ZWRUYXJnZXQ7XG4gICAgICB9KSxcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgdGhpcy5zZXR0aW5ncy50YXJnZXRzKSB7XG4gICAgICBjb25zdCBub3JtYWxpemVkVmF1bHRQYXRoID0gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh0YXJnZXQudmF1bHRQYXRoKTtcbiAgICAgIGlmICh0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiAmJiBwYXRoLmlzQWJzb2x1dGUobm9ybWFsaXplZFZhdWx0UGF0aCkpIHtcbiAgICAgICAgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoID0gYXdhaXQgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyLnJlc29sdmVEZWZhdWx0QXR0YWNobWVudFBhdGgobm9ybWFsaXplZFZhdWx0UGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyQ29tbWFuZHMoKTogdm9pZCB7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktYWN0aXZlLWZpbGUtdG8tdmF1bHRcIixcbiAgICAgIG5hbWU6IFRSQU5TRkVSX01PREVfTUVUQURBVEEuY29weS5jb21tYW5kTmFtZSxcbiAgICAgIGNoZWNrQ2FsbGJhY2s6IChjaGVja2luZykgPT4gdGhpcy5oYW5kbGVBY3RpdmVGaWxlQ29tbWFuZChcImNvcHlcIiwgY2hlY2tpbmcpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJtb3ZlLWFjdGl2ZS1maWxlLXRvLXZhdWx0XCIsXG4gICAgICBuYW1lOiBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBLm1vdmUuY29tbWFuZE5hbWUsXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHRoaXMuaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQoXCJtb3ZlXCIsIGNoZWNraW5nKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQobW9kZTogVHJhbnNmZXJNb2RlLCBjaGVja2luZzogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoY2hlY2tpbmcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLm9wZW5UYXJnZXRNb2RhbChtb2RlLCBbYWN0aXZlRmlsZV0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckNvbnRleHRNZW51cygpOiB2b2lkIHtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKFwiZmlsZS1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIFtmaWxlXSk7XG4gICAgfSkpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlcy1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlczogVEFic3RyYWN0RmlsZVtdKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIGZpbGVzKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnRyeVJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JNZW51cygpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk7XG4gICAgfSkpO1xuXG4gICAgaWYgKCF0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICB0aGlzLm5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgdGhpcy50cnlSZWdpc3Rlck5vdGVib29rTmF2aWdhdG9yTWVudXMoKTtcbiAgICAgIH0sIDIwMDApO1xuICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vdGVib29rTmF2aWdhdG9yID0gKCh0aGlzLmFwcCBhcyB1bmtub3duIGFzIHsgcGx1Z2lucz86IHsgcGx1Z2lucz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0gfSkucGx1Z2lucz8ucGx1Z2lucz8uW1wibm90ZWJvb2stbmF2aWdhdG9yXCJdIGFzIHtcbiAgICAgIGFwaT86IHtcbiAgICAgICAgbWVudXM/OiB7XG4gICAgICAgICAgcmVnaXN0ZXJGaWxlTWVudT86IChjYWxsYmFjazogKGNvbnRleHQ6IHVua25vd24pID0+IHZvaWQpID0+ICgoKSA9PiB2b2lkKSB8IHZvaWQ7XG4gICAgICAgICAgcmVnaXN0ZXJGb2xkZXJNZW51PzogKGNhbGxiYWNrOiAoY29udGV4dDogdW5rbm93bikgPT4gdm9pZCkgPT4gKCgpID0+IHZvaWQpIHwgdm9pZDtcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgfSB8IHVuZGVmaW5lZCk/LmFwaTtcblxuICAgIGlmICghbm90ZWJvb2tOYXZpZ2F0b3I/Lm1lbnVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlzcG9zZUZpbGVNZW51ID0gbm90ZWJvb2tOYXZpZ2F0b3IubWVudXMucmVnaXN0ZXJGaWxlTWVudT8uKChjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCBtZW51Q29udGV4dCA9IGdldEV4dGVybmFsTWVudUNvbnRleHQoY29udGV4dCk7XG4gICAgICBpZiAoIW1lbnVDb250ZXh0IHx8ICFtZW51Q29udGV4dC5hZGRJdGVtKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IEFycmF5LmlzQXJyYXkobWVudUNvbnRleHQuc2VsZWN0aW9uPy5maWxlcylcbiAgICAgICAgPyBtZW51Q29udGV4dC5zZWxlY3Rpb24uZmlsZXMuZmlsdGVyKGlzQWJzdHJhY3RGaWxlKVxuICAgICAgICA6IGlzQWJzdHJhY3RGaWxlKG1lbnVDb250ZXh0LmZpbGUpID8gW21lbnVDb250ZXh0LmZpbGVdIDogW107XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUobWVudUNvbnRleHQuYWRkSXRlbSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgICBpZiAodHlwZW9mIGRpc3Bvc2VGaWxlTWVudSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyKGRpc3Bvc2VGaWxlTWVudSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlzcG9zZUZvbGRlck1lbnUgPSBub3RlYm9va05hdmlnYXRvci5tZW51cy5yZWdpc3RlckZvbGRlck1lbnU/LigoY29udGV4dCkgPT4ge1xuICAgICAgY29uc3QgbWVudUNvbnRleHQgPSBnZXRFeHRlcm5hbE1lbnVDb250ZXh0KGNvbnRleHQpO1xuICAgICAgaWYgKCFtZW51Q29udGV4dCB8fCAhbWVudUNvbnRleHQuYWRkSXRlbSB8fCAhaXNBYnN0cmFjdEZpbGUobWVudUNvbnRleHQuZm9sZGVyKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUobWVudUNvbnRleHQuYWRkSXRlbSwgW21lbnVDb250ZXh0LmZvbGRlcl0pO1xuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZGlzcG9zZUZvbGRlck1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRm9sZGVyTWVudSk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgICAgdGhpcy5ub3RlYm9va05hdmlnYXRvclJldHJ5SW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRUcmFuc2Zlck1lbnVJdGVtcyhtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLnBsYW5uZXIubm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbik7XG4gICAgaWYgKG5vcm1hbGl6ZWRTZWxlY3Rpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYWRkTW9kZU1lbnVJdGVtKG1lbnUsIG5vcm1hbGl6ZWRTZWxlY3Rpb24sIFwiY29weVwiKTtcbiAgICB0aGlzLmFkZE1vZGVNZW51SXRlbShtZW51LCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogdm9pZCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbGVjdGlvbiA9IHRoaXMucGxhbm5lci5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBpZiAobm9ybWFsaXplZFNlbGVjdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcImNvcHlcIik7XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZE1vZGVNZW51SXRlbShtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgbW9kZTogVHJhbnNmZXJNb2RlKTogdm9pZCB7XG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTW9kZU1lbnVJdGVtVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCBtb2RlOiBUcmFuc2Zlck1vZGUpOiB2b2lkIHtcbiAgICBhZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uZmlndXJlVHJhbnNmZXJNZW51SXRlbShpdGVtOiBNZW51SXRlbSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10sIG1vZGU6IFRyYW5zZmVyTW9kZSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gVFJBTlNGRVJfTU9ERV9NRVRBREFUQVttb2RlXTtcbiAgICBpdGVtLnNldFRpdGxlKG1ldGFkYXRhLm1lbnVUaXRsZSkuc2V0SWNvbihtZXRhZGF0YS5pY29uKTtcbiAgICBjb25zdCBzZWxlY3RhYmxlVGFyZ2V0cyA9IHRoaXMuZ2V0U2VsZWN0YWJsZVRhcmdldHMoKTtcbiAgICBpZiAoc2VsZWN0YWJsZVRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpdGVtLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlblRhcmdldE1vZGFsKG1vZGU6IFRyYW5zZmVyTW9kZSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5nZXRTZWxlY3RhYmxlVGFyZ2V0cygpO1xuICAgIGlmICh0YXJnZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShcIkFkZCBhIGRlc3RpbmF0aW9uIHZhdWx0IGZpcnN0LlwiLCA4MDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGl0bGUgPSBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBW21vZGVdLnRhcmdldE1vZGFsVGl0bGU7XG4gICAgbmV3IFRhcmdldFZhdWx0U3VnZ2VzdE1vZGFsKHRoaXMuYXBwLCB0YXJnZXRzLCB0aXRsZSwgKHRhcmdldCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnJ1blRyYW5zZmVyKG1vZGUsIHNlbGVjdGlvbiwgdGFyZ2V0KTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGFibGVUYXJnZXRzKCk6IERlc3RpbmF0aW9uQ29uZmlnW10ge1xuICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKCh0YXJnZXQpID0+IHRhcmdldC5uYW1lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuVHJhbnNmZXIobW9kZTogVHJhbnNmZXJNb2RlLCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwbGFuID0gYXdhaXQgdGhpcy5wbGFubmVyLnByZXBhcmUoc2VsZWN0aW9uLCB0YXJnZXQpO1xuICAgICAgY29uc3QgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMgPSBhd2FpdCB0aGlzLm1heWJlUmV2aWV3UGxhbihwbGFuKTtcbiAgICAgIGlmIChjb25maXJtZWRTZWxlY3Rpb25QYXRocyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCB0aGlzLmV4ZWN1dG9yLmV4ZWN1dGUocGxhbiwgbW9kZSwgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpO1xuICAgICAgdGhpcy5zaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGUsIHN1bW1hcnkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJDb3VsZG4ndCBjb21wbGV0ZSB0aGUgdHJhbnNmZXIuXCIsIDEyMDAwKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1heWJlUmV2aWV3UGxhbihwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbik6IFByb21pc2U8c3RyaW5nW10gfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiA9IHBsYW4uZXhwbGljaXRNYXJrZG93blBhdGhzLmxlbmd0aCA+IDA7XG4gICAgY29uc3QgaGFzUmVsZXZhbnRSZWxhdGlvbnNoaXBzID0gcGxhbi5yZXZpZXdSb290cy5zb21lKChyb290KSA9PiByb290LmNoaWxkcmVuLmxlbmd0aCA+IDApO1xuICAgIGlmICghaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiB8fCB0aGlzLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUgPT09IFwibmV2ZXJcIikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9PT0gXCJsaW5rZWQtb25seVwiICYmICFoYXNSZWxldmFudFJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5ldyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgcGxhbi5yZXZpZXdSb290cywgdGhpcy5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5KS53YWl0Rm9yUmVzdWx0KCk7XG4gICAgaWYgKCFyZXN1bHQuY29uZmlybWVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5zZWxlY3RlZFBhdGhzO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGU6IFRyYW5zZmVyTW9kZSwgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5KTogdm9pZCB7XG4gICAgY29uc3QgY29tcGxldGVkQ291bnQgPSBtb2RlID09PSBcImNvcHlcIiA/IHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgOiBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50O1xuICAgIGNvbnN0IGFjdGlvbiA9IG1vZGUgPT09IFwiY29weVwiID8gXCJDb3B5IGNvbXBsZXRlXCIgOiBcIk1vdmUgY29tcGxldGVcIjtcbiAgICBjb25zdCBwYXJ0cyA9IFtgJHtjb21wbGV0ZWRDb3VudH0gb2YgJHtzdW1tYXJ5LnJlcXVlc3RlZEZpbGVDb3VudH0gaXRlbXMgdHJhbnNmZXJyZWRgXTtcbiAgICBpZiAoc3VtbWFyeS5yZW5hbWVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkucmVuYW1lZENvdW50LCBcIml0ZW0gcmVuYW1lZFwiLCBcIml0ZW1zIHJlbmFtZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCwgXCJpdGVtIHNraXBwZWRcIiwgXCJpdGVtcyBza2lwcGVkXCIpKTtcbiAgICB9XG4gICAgaWYgKHN1bW1hcnkuZmFpbGVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkuZmFpbGVkQ291bnQsIFwiaXRlbSBmYWlsZWRcIiwgXCJpdGVtcyBmYWlsZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGggPiAwICYmIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgPT09IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGgsIFwid2FybmluZ1wiLCBcIndhcm5pbmdzXCIpKTtcbiAgICB9XG5cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZVwiIH0pO1xuICAgICAgY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2UtdGl0bGVcIiwgdGV4dDogYCR7YWN0aW9ufSB3aXRoIHdhcm5pbmdzOiAke3BhcnRzLmpvaW4oXCIsIFwiKX0uYCB9KTtcbiAgICAgIGNvbnN0IHNob3duRW50cmllcyA9IHN1bW1hcnkuc2tpcHBlZEVudHJpZXMuc2xpY2UoMCwgMTApO1xuICAgICAgY29uc3QgbGlzdCA9IGNvbnRhaW5lci5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2UtbGlzdFwiIH0pO1xuICAgICAgZm9yIChjb25zdCBza2lwcGVkIG9mIHNob3duRW50cmllcykge1xuICAgICAgICBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyB0ZXh0OiBza2lwcGVkIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHN1bW1hcnkuc2tpcHBlZEVudHJpZXMubGVuZ3RoID4gc2hvd25FbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICBjb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZS1tb3JlXCIsIHRleHQ6IGAuLi4gYW5kICR7Zm9ybWF0Q291bnQoc3VtbWFyeS5za2lwcGVkRW50cmllcy5sZW5ndGggLSBzaG93bkVudHJpZXMubGVuZ3RoLCBcIm1vcmUgc2tpcHBlZCBpdGVtXCIsIFwibW9yZSBza2lwcGVkIGl0ZW1zXCIpfS5gIH0pO1xuICAgICAgfVxuICAgICAgY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2UtZGlzbWlzc1wiLCB0ZXh0OiBcIkNsaWNrIHRvIGRpc21pc3NcIiB9KTtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICBjb25zdCBub3RpY2UgPSBuZXcgTm90aWNlKGZyYWdtZW50LCAwKTtcbiAgICAgIG5vdGljZS5tZXNzYWdlRWwuYWRkQ2xhc3MoXCJ0cmFuc3ZhdWx0LW5vdGljZS1jbGlja2FibGVcIik7XG4gICAgICBub3RpY2UubWVzc2FnZUVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgIG5vdGljZS5oaWRlKCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBuZXcgTm90aWNlKGAke2FjdGlvbn06ICR7cGFydHMuam9pbihcIiwgXCIpfS5gLCAxMDAwMCk7XG4gIH1cbn0iLCAiIyBUcmFucyBWYXVsdCBSZWxlYXNlIE5vdGVzXG5cbiMjIFZlcnNpb24gMS4xLjBcblxuIyMjIEFkZGVkXG5cbi0gUmVsZWFzZSBub3RlcyBjYW4gbm93IGJlIHZpZXdlZCBmcm9tIHRoZSBzZXR0aW5ncyBtZW51LlxuXG4jIyMgQ2hhbmdlZFxuXG4tIFRoZSBkZXRlY3Rpb24gb2YgdGhlIGRlZmF1bHQgYXR0YWNobWVudCBwYXRoIGluIHRoZSBkZXN0aW5hdGlvbiB2YXVsdCBkZWZhdWx0cyBub3cgdG8gXCJvZmZcIi4gTm8gdXNlciBpbnRlcmFjdGlvbiBpcyByZXF1aXJlZCwgYXMgcHJldmlvdXMgc2V0dGluZ3Mgd2lsbCBub3QgYmUgY2hhbmdlZC5cblxuXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0JBQWU7QUFDZixnQkFBZTtBQUNmLGtCQUFpQjtBQUNqQixzQkF1Qk87OztBQzFCUDs7O0FEbUlBLFNBQVMsU0FBUyxPQUFrRDtBQUNsRSxTQUFPLE9BQU8sVUFBVSxZQUFZLFVBQVU7QUFDaEQ7QUFFQSxTQUFTLGVBQWUsT0FBd0M7QUFDOUQsU0FBTyxpQkFBaUIseUJBQVMsaUJBQWlCO0FBQ3BEO0FBRUEsU0FBUyx1QkFBdUIsT0FBNEM7QUFDMUUsTUFBSSxDQUFDLFNBQVMsS0FBSyxHQUFHO0FBQ3BCLFdBQU87QUFBQSxFQUNUO0FBQ0EsUUFBTSxZQUFZLFNBQVMsTUFBTSxTQUFTLEtBQUssTUFBTSxRQUFRLE1BQU0sVUFBVSxLQUFLLElBQzlFLEVBQUUsT0FBTyxNQUFNLFVBQVUsTUFBTSxJQUMvQjtBQUNKLFNBQU87QUFBQSxJQUNMLFNBQVMsT0FBTyxNQUFNLFlBQVksYUFBYSxNQUFNLFVBQTZCO0FBQUEsSUFDbEYsTUFBTSxNQUFNO0FBQUEsSUFDWixRQUFRLE1BQU07QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUNGO0FBWUEsSUFBTSxtQkFBdUM7QUFBQSxFQUMzQyxrQkFBa0I7QUFBQSxFQUNsQixvQkFBb0I7QUFBQSxFQUNwQixrQkFBa0I7QUFBQSxFQUNsQix1QkFBdUI7QUFBQSxFQUN2Qiw2QkFBNkI7QUFBQSxFQUM3QixzQkFBc0I7QUFBQSxFQUN0QixTQUFTLENBQUM7QUFDWjtBQUVBLElBQU0seUJBS0Q7QUFBQSxFQUNILE1BQU07QUFBQSxJQUNKLFdBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxJQUNiLGtCQUFrQjtBQUFBLElBQ2xCLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxNQUFNO0FBQUEs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QUFrQjtBQUNuRCxVQUFNLFFBQVEsQ0FBQyxHQUFHLGNBQWMsT0FBTyxRQUFRLGtCQUFrQixvQkFBb0I7QUFDckYsUUFBSSxRQUFRLGVBQWUsR0FBRztBQUM1QixZQUFNLEtBQUssWUFBWSxRQUFRLGNBQWMsZ0JBQWdCLGVBQWUsQ0FBQztBQUFBLElBQy9FO0FBQ0EsUUFBSSxRQUFRLHVCQUF1QixHQUFHO0FBQ3BDLFlBQU0sS0FBSyxZQUFZLFFBQVEsc0JBQXNCLGdCQUFnQixlQUFlLENBQUM7QUFBQSxJQUN2RjtBQUNBLFFBQUksUUFBUSxjQUFjLEdBQUc7QUFDM0IsWUFBTSxLQUFLLFlBQVksUUFBUSxhQUFhLGVBQWUsY0FBYyxDQUFDO0FBQUEsSUFDNUU7QUFDQSxRQUFJLFFBQVEsU0FBUyxTQUFTLEtBQUssUUFBUSx5QkFBeUIsR0FBRztBQUNyRSxZQUFNLEtBQUssWUFBWSxRQUFRLFNBQVMsUUFBUSxXQUFXLFVBQVUsQ0FBQztBQUFBLElBQ3hFO0FBRUEsUUFBSSxRQUFRLHVCQUF1QixHQUFHO0FBQ3BDLFlBQU0sV0FBVyxTQUFTLHVCQUF1QjtBQUNqRCxZQUFNLFlBQVksU0FBUyxPQUFPLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUNuRSxnQkFBVSxTQUFTLE9BQU8sRUFBRSxLQUFLLGdDQUFnQyxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsTUFBTSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDeEgsWUFBTSxlQUFlLFFBQVEsZUFBZSxNQUFNLEdBQUcsRUFBRTtBQUN2RCxZQUFNLE9BQU8sVUFBVSxTQUFTLE1BQU0sRUFBRSxLQUFLLDhCQUE4QixDQUFDO0FBQzVFLGlCQUFXLFdBQVcsY0FBYztBQUNsQyxhQUFLLFNBQVMsTUFBTSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQUEsTUFDdkM7QUFDQSxVQUFJLFFBQVEsZUFBZSxTQUFTLGFBQWEsUUFBUTtBQUN2RCxrQkFBVSxTQUFTLE9BQU8sRUFBRSxLQUFLLCtCQUErQixNQUFNLFdBQVcsWUFBWSxRQUFRLGVBQWUsU0FBUyxhQUFhLFFBQVEscUJBQXFCLG9CQUFvQixDQUFDLElBQUksQ0FBQztBQUFBLE1BQ25NO0FBQ0EsZ0JBQVUsU0FBUyxPQUFPLEVBQUUsS0FBSyxrQ0FBa0MsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RixlQUFTLFlBQVksU0FBUztBQUM5QixZQUFNLFNBQVMsSUFBSSx1QkFBTyxVQUFVLENBQUM7QUFDckMsYUFBTyxVQUFVLFNBQVMsNkJBQTZCO0FBQ3ZELGFBQU8sVUFBVSxpQkFBaUIsU0FBUyxNQUFNO0FBQy9DLGVBQU8sS0FBSztBQUFBLE1BQ2QsQ0FBQztBQUNEO0FBQUEsSUFDRjtBQUVBLFFBQUksdUJBQU8sR0FBRyxNQUFNLEtBQUssTUFBTSxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUs7QUFBQSxFQUNyRDtBQUNGOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgIm9zIiwgImZzIl0KfQo=
