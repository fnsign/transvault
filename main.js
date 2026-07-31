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
    this.renderLegacySettings = () => {
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
      this.renderDestinationSettings(containerEl);
    };
  }
  getSettingDefinitions() {
    return [
      {
        name: "Release notes",
        desc: "Read what changed in this version.",
        action: () => new ReleaseNotesModal(this.app).open()
      },
      {
        name: "Conflict handling",
        desc: "Choose whether existing destination files are skipped, renamed automatically, or overwritten.",
        control: {
          type: "dropdown",
          key: "conflictStrategy",
          options: Object.fromEntries(
            Object.entries(CONFLICT_STRATEGY_METADATA).map(([value, meta]) => [value, meta.label])
          )
        }
      },
      {
        name: "Include linked files",
        desc: "Include directly related notes and linked non-Markdown files from selected notes.",
        control: { type: "toggle", key: "includeLinkedFiles" }
      },
      {
        name: "Review dialog",
        desc: "Choose when to show the transfer review dialog.",
        control: {
          type: "dropdown",
          key: "reviewDialogMode",
          options: {
            always: "Always",
            "linked-only": "Only when notes are linked",
            never: "Never"
          }
        }
      },
      {
        name: "Tags for copied notes",
        desc: "Comma-separated tags added to transferred Markdown files when copying.",
        control: { type: "text", key: "tagsForCopiedElements", placeholder: "copied, sent" }
      },
      {
        name: "Also tag copied source notes",
        desc: "Write the configured copy tags back into source Markdown files in the active vault.",
        control: { type: "toggle", key: "alsoTagCopiedSourceElements" }
      },
      {
        name: "Tags for moved notes",
        desc: "Comma-separated tags added to transferred Markdown files when moving.",
        control: { type: "text", key: "tagsForMovedElements", placeholder: "moved, archived" }
      },
      {
        name: "Destination vaults",
        desc: "Configure local destination vaults for copied and moved content.",
        render: (setting) => {
          setting.settingEl.empty();
          setting.settingEl.addClass("transvault-destination-settings");
          this.renderDestinationSettings(setting.settingEl);
        }
      }
    ];
  }
  renderDestinationSettings(containerEl) {
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
        await this.plugin.saveSettings();
        this.update();
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
        await this.saveAndRefresh();
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
        await this.saveAndRefresh();
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
  async saveAndRefresh() {
    await this.plugin.saveSettings();
    this.update();
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
      const fragment = createFragment();
      const container = fragment.createDiv({ cls: "transvault-skip-notice" });
      container.createDiv({ cls: "transvault-skip-notice-title", text: `${action} with warnings: ${parts.join(", ")}.` });
      const shownEntries = summary.skippedEntries.slice(0, 10);
      const list = container.createEl("ul", { cls: "transvault-skip-notice-list" });
      for (const skipped of shownEntries) {
        list.createEl("li", { text: skipped });
      }
      if (summary.skippedEntries.length > shownEntries.length) {
        container.createDiv({ cls: "transvault-skip-notice-more", text: `... and ${formatCount(summary.skippedEntries.length - shownEntries.length, "more skipped item", "more skipped items")}.` });
      }
      container.createDiv({ cls: "transvault-skip-notice-dismiss", text: "Click to dismiss" });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyIsICJSRUxFQVNFTk9URVMubWQiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCBvcyBmcm9tIFwib3NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQge1xuICBBcHAsXG4gIENvbXBvbmVudCxcbiAgRmlsZVN5c3RlbUFkYXB0ZXIsXG4gIEZ1enp5TWF0Y2gsXG4gIEZ1enp5U3VnZ2VzdE1vZGFsLFxuICBNZW51LFxuICBNZW51SXRlbSxcbiAgTWFya2Rvd25SZW5kZXJlcixcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGxhdGZvcm0sXG4gIFBsdWdpbixcbiAgUGx1Z2luU2V0dGluZ1RhYixcbiAgU2V0dGluZyxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFRGb2xkZXIsXG4gIGdldExpbmtwYXRoLFxuICBub3JtYWxpemVQYXRoLFxuICBwYXJzZVlhbWwsXG4gIHNldEljb24sXG4gIHN0cmluZ2lmeVlhbWwsXG59IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHJlbGVhc2VOb3RlcyBmcm9tIFwiLi9SRUxFQVNFTk9URVMubWRcIjtcblxudHlwZSBUcmFuc2Zlck1vZGUgPSBcImNvcHlcIiB8IFwibW92ZVwiO1xudHlwZSBDb25mbGljdFN0cmF0ZWd5ID0gXCJza2lwXCIgfCBcImF1dG8tcmVuYW1lXCIgfCBcIm92ZXJ3cml0ZVwiO1xudHlwZSBSZXZpZXdEaXJlY3Rpb24gPSBcInRvXCIgfCBcImZyb21cIjtcbnR5cGUgUmV2aWV3Tm9kZVR5cGUgPSBcIm5vdGVcIiB8IFwiZ3JvdXBcIiB8IFwiYXR0YWNobWVudFwiO1xudHlwZSBSZXZpZXdEaWFsb2dNb2RlID0gXCJhbHdheXNcIiB8IFwibGlua2VkLW9ubHlcIiB8IFwibmV2ZXJcIjtcblxuaW50ZXJmYWNlIERlc3RpbmF0aW9uQ29uZmlnIHtcbiAgaWQ6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICB2YXVsdFBhdGg6IHN0cmluZztcbiAgZGVzdGluYXRpb25QYXRoOiBzdHJpbmc7XG4gIHVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb246IGJvb2xlYW47XG4gIGF0dGFjaG1lbnRQYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUcmFuc1ZhdWx0U2V0dGluZ3Mge1xuICBjb25mbGljdFN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5O1xuICBpbmNsdWRlTGlua2VkRmlsZXM6IGJvb2xlYW47XG4gIHJldmlld0RpYWxvZ01vZGU6IFJldmlld0RpYWxvZ01vZGU7XG4gIHRhZ3NGb3JDb3BpZWRFbGVtZW50czogc3RyaW5nO1xuICBhbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHM6IGJvb2xlYW47XG4gIHRhZ3NGb3JNb3ZlZEVsZW1lbnRzOiBzdHJpbmc7XG4gIHRhcmdldHM6IERlc3RpbmF0aW9uQ29uZmlnW107XG59XG5cbmludGVyZmFjZSBSZXZpZXdOb2RlIHtcbiAgaWQ6IHN0cmluZztcbiAgdHlwZTogUmV2aWV3Tm9kZVR5cGU7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGZpbGVQYXRoPzogc3RyaW5nO1xuICBkaXJlY3Rpb24/OiBSZXZpZXdEaXJlY3Rpb247XG4gIGNoaWxkcmVuOiBSZXZpZXdOb2RlW107XG59XG5cbmludGVyZmFjZSBEaXJlY3REZXBlbmRlbmNpZXMge1xuICBtYXJrZG93bjogU2V0PHN0cmluZz47XG4gIGF0dGFjaG1lbnRzOiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIERpcmVjdFJlbGF0aW9uc2hpcHMgZXh0ZW5kcyBEaXJlY3REZXBlbmRlbmNpZXMge1xuICBiYWNrbGlua3M6IFNldDxzdHJpbmc+O1xufVxuXG5pbnRlcmZhY2UgRXhwbGljaXRGaWxlU2VsZWN0aW9uIHtcbiAgZmlsZTogVEZpbGU7XG4gIGRlc3RpbmF0aW9uUmVsYXRpdmVQYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBSZXNvbHZlZERlc3RpbmF0aW9uQ29uZmlnIGV4dGVuZHMgRGVzdGluYXRpb25Db25maWcge1xuICB2YXVsdFBhdGg6IHN0cmluZztcbiAgZGVzdGluYXRpb25QYXRoOiBzdHJpbmc7XG4gIGVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQcmVwYXJlZFRyYW5zZmVyUGxhbiB7XG4gIHNvdXJjZVZhdWx0Um9vdDogc3RyaW5nO1xuICB0YXJnZXQ6IFJlc29sdmVkRGVzdGluYXRpb25Db25maWc7XG4gIGV4cGxpY2l0RmlsZXM6IEV4cGxpY2l0RmlsZVNlbGVjdGlvbltdO1xuICBleHBsaWNpdE1hcmtkb3duUGF0aHM6IHN0cmluZ1tdO1xuICBzZWxlY3RlZEZvbGRlclBhdGhzOiBzdHJpbmdbXTtcbiAgcmV2aWV3Um9vdHM6IFJldmlld05vZGVbXTtcbiAgZGlyZWN0RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBEaXJlY3REZXBlbmRlbmNpZXM+O1xuICBkaXJlY3RNYXJrZG93blJlbGF0aW9uczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+O1xufVxuXG5pbnRlcmZhY2UgRHJhZnRUcmFuc2ZlckVudHJ5IHtcbiAgc291cmNlRmlsZTogVEZpbGU7XG4gIHNvdXJjZUFic29sdXRlUGF0aDogc3RyaW5nO1xuICBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aDogc3RyaW5nO1xuICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmc7XG4gIHNob3VsZFJld3JpdGVMaW5rczogYm9vbGVhbjtcbiAgaXNFeHBsaWNpdFNlbGVjdGlvbjogYm9vbGVhbjtcbiAgd2FzUmVuYW1lZDogYm9vbGVhbjtcbiAgb3ZlcndyaXRlRXhpc3Rpbmc6IGJvb2xlYW47XG59XG5cbnR5cGUgRmluYWxpemVkVHJhbnNmZXJFbnRyeSA9IERyYWZ0VHJhbnNmZXJFbnRyeTtcblxuaW50ZXJmYWNlIFRyYW5zZmVyU3VtbWFyeSB7XG4gIHJlcXVlc3RlZEZpbGVDb3VudDogbnVtYmVyO1xuICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogbnVtYmVyO1xuICBtb3ZlZEZpbGVDb3VudDogbnVtYmVyO1xuICBza2lwcGVkQ29uZmxpY3RDb3VudDogbnVtYmVyO1xuICByZW5hbWVkQ291bnQ6IG51bWJlcjtcbiAgZmFpbGVkQ291bnQ6IG51bWJlcjtcbiAgc2tpcHBlZEVudHJpZXM6IHN0cmluZ1tdO1xuICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBSZXZpZXdNb2RhbFJlc3VsdCB7XG4gIGNvbmZpcm1lZDogYm9vbGVhbjtcbiAgc2VsZWN0ZWRQYXRoczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBFeHRlcm5hbE1lbnVDb250ZXh0IHtcbiAgYWRkSXRlbT86IE1lbnVbXCJhZGRJdGVtXCJdO1xuICBmaWxlPzogdW5rbm93bjtcbiAgZm9sZGVyPzogdW5rbm93bjtcbiAgc2VsZWN0aW9uPzogeyBmaWxlcz86IHVua25vd25bXSB9O1xufVxuXG5mdW5jdGlvbiBpc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNBYnN0cmFjdEZpbGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBUQWJzdHJhY3RGaWxlIHtcbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgVEZpbGUgfHwgdmFsdWUgaW5zdGFuY2VvZiBURm9sZGVyO1xufVxuXG5mdW5jdGlvbiBnZXRFeHRlcm5hbE1lbnVDb250ZXh0KHZhbHVlOiB1bmtub3duKTogRXh0ZXJuYWxNZW51Q29udGV4dCB8IG51bGwge1xuICBpZiAoIWlzUmVjb3JkKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGlzUmVjb3JkKHZhbHVlLnNlbGVjdGlvbikgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZS5zZWxlY3Rpb24uZmlsZXMpXG4gICAgPyB7IGZpbGVzOiB2YWx1ZS5zZWxlY3Rpb24uZmlsZXMgfVxuICAgIDogdW5kZWZpbmVkO1xuICByZXR1cm4ge1xuICAgIGFkZEl0ZW06IHR5cGVvZiB2YWx1ZS5hZGRJdGVtID09PSBcImZ1bmN0aW9uXCIgPyB2YWx1ZS5hZGRJdGVtIGFzIE1lbnVbXCJhZGRJdGVtXCJdIDogdW5kZWZpbmVkLFxuICAgIGZpbGU6IHZhbHVlLmZpbGUsXG4gICAgZm9sZGVyOiB2YWx1ZS5mb2xkZXIsXG4gICAgc2VsZWN0aW9uLFxuICB9O1xufVxuXG5pbnRlcmZhY2UgRnJvbnRtYXR0ZXJUYWdSZXN1bHQge1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHdhcm5pbmc/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQYXJzZWRNYXJrZG93bkhyZWYge1xuICBwYXRoOiBzdHJpbmc7XG4gIHdyYXBwZWRJbkFuZ2xlczogYm9vbGVhbjtcbn1cblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogVHJhbnNWYXVsdFNldHRpbmdzID0ge1xuICBjb25mbGljdFN0cmF0ZWd5OiBcInNraXBcIixcbiAgaW5jbHVkZUxpbmtlZEZpbGVzOiB0cnVlLFxuICByZXZpZXdEaWFsb2dNb2RlOiBcImFsd2F5c1wiLFxuICB0YWdzRm9yQ29waWVkRWxlbWVudHM6IFwiXCIsXG4gIGFsc29UYWdDb3BpZWRTb3VyY2VFbGVtZW50czogZmFsc2UsXG4gIHRhZ3NGb3JNb3ZlZEVsZW1lbnRzOiBcIlwiLFxuICB0YXJnZXRzOiBbXSxcbn07XG5cbmNvbnN0IFRSQU5TRkVSX01PREVfTUVUQURBVEE6IFJlY29yZDxUcmFuc2Zlck1vZGUsIHtcbiAgbWVudVRpdGxlOiBzdHJpbmc7XG4gIGNvbW1hbmROYW1lOiBzdHJpbmc7XG4gIHRhcmdldE1vZGFsVGl0bGU6IHN0cmluZztcbiAgaWNvbjogc3RyaW5nO1xufT4gPSB7XG4gIGNvcHk6IHtcbiAgICBtZW51VGl0bGU6IFwiQ29weSB0byB2YXVsdC4uLlwiLFxuICAgIGNvbW1hbmROYW1lOiBcIkNvcHkgYWN0aXZlIGZpbGUgdG8gdmF1bHQuLi5cIixcbiAgICB0YXJnZXRNb2RhbFRpdGxlOiBcIkNob29zZSBhIHZhdWx0IHRvIGNvcHkgdG9cIixcbiAgICBpY29uOiBcImNvcHktcGx1c1wiLFxuICB9LFxuICBtb3ZlOiB7XG4gICAgbWVudVRpdGxlOiBcIk1vdmUgdG8gdmF1bHQuLi5cIixcbiAgICBjb21tYW5kTmFtZTogXCJNb3ZlIGFjdGl2ZSBmaWxlIHRvIHZhdWx0Li4uXCIsXG4gICAgdGFyZ2V0TW9kYWxUaXRsZTogXCJDaG9vc2UgYSB2YXVsdCB0byBtb3ZlIHRvXCIsXG4gICAgaWNvbjogXCJmb2xkZXItc3ltbGlua1wiLFxuICB9LFxufTtcblxuY29uc3QgQ09ORkxJQ1RfU1RSQVRFR1lfTUVUQURBVEE6IFJlY29yZDxDb25mbGljdFN0cmF0ZWd5LCB7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG59PiA9IHtcbiAgc2tpcDoge1xuICAgIGxhYmVsOiBcIlNraXBcIixcbiAgICBkZXNjcmlwdGlvbjogXCJFeGlzdGluZyBkZXN0aW5hdGlvbiBmaWxlcyB3aWxsIGJlIHNraXBwZWQgZHVyaW5nIHRyYW5zZmVyLlwiLFxuICB9LFxuICBcImF1dG8tcmVuYW1lXCI6IHtcbiAgICBsYWJlbDogXCJBdXRvLXJlbmFtZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIHdpbGwgYmUga2VwdCwgYW5kIG5ldyBjb3BpZXMgd2lsbCBiZSByZW5hbWVkIGF1dG9tYXRpY2FsbHkuXCIsXG4gIH0sXG4gIG92ZXJ3cml0ZToge1xuICAgIGxhYmVsOiBcIk92ZXJ3cml0ZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRyYW5zZmVyLlwiLFxuICB9LFxufTtcblxuZnVuY3Rpb24gY3JlYXRlRGVzdGluYXRpb25JZCgpOiBzdHJpbmcge1xuICByZXR1cm4gYGRlc3RpbmF0aW9uLSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLCA4KX1gO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCk6IERlc3RpbmF0aW9uQ29uZmlnIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogY3JlYXRlRGVzdGluYXRpb25JZCgpLFxuICAgIG5hbWU6IFwiXCIsXG4gICAgdmF1bHRQYXRoOiBcIlwiLFxuICAgIGRlc3RpbmF0aW9uUGF0aDogXCJcIixcbiAgICB1c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uOiBmYWxzZSxcbiAgICBhdHRhY2htZW50UGF0aDogXCJcIixcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0RGVzdGluYXRpb25EaXNwbGF5TmFtZSh0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZE5hbWUgPSB0YXJnZXQubmFtZS50cmltKCk7XG4gIGlmICh0cmltbWVkTmFtZS5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHRyaW1tZWROYW1lO1xuICB9XG4gIGNvbnN0IHRyaW1tZWRWYXVsdFBhdGggPSB0YXJnZXQudmF1bHRQYXRoLnRyaW0oKTtcbiAgaWYgKHRyaW1tZWRWYXVsdFBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIFwiVW5uYW1lZCBkZXN0aW5hdGlvblwiO1xuICB9XG4gIGNvbnN0IHBhcnRzID0gdHJpbW1lZFZhdWx0UGF0aC5zcGxpdCgvWy9cXFxcXSsvKS5maWx0ZXIoQm9vbGVhbik7XG4gIHJldHVybiBwYXJ0cy5hdCgtMSkgPz8gdHJpbW1lZFZhdWx0UGF0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmxpY3RTdHJhdGVneUxhYmVsKHN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5KTogc3RyaW5nIHtcbiAgcmV0dXJuIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW3N0cmF0ZWd5XS5sYWJlbDtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmxpY3RTdHJhdGVneURlc2NyaXB0aW9uKHN0cmF0ZWd5OiBDb25mbGljdFN0cmF0ZWd5KTogc3RyaW5nIHtcbiAgcmV0dXJuIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW3N0cmF0ZWd5XS5kZXNjcmlwdGlvbjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q291bnQoY291bnQ6IG51bWJlciwgc2luZ3VsYXI6IHN0cmluZywgcGx1cmFsOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7Y291bnR9ICR7Y291bnQgPT09IDEgPyBzaW5ndWxhciA6IHBsdXJhbH1gO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVBYnNvbHV0ZVBhdGgodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLm5vcm1hbGl6ZShwYXRoLnJlc29sdmUodmFsdWUpKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IG5vcm1hbGl6ZWQgPSB2YWx1ZS50cmltKCk7XG4gIGlmIChcbiAgICAobm9ybWFsaXplZC5zdGFydHNXaXRoKCdcIicpICYmIG5vcm1hbGl6ZWQuZW5kc1dpdGgoJ1wiJykpXG4gICAgfHwgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aChcIidcIikgJiYgbm9ybWFsaXplZC5lbmRzV2l0aChcIidcIikpXG4gICkge1xuICAgIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkLnNsaWNlKDEsIC0xKS50cmltKCk7XG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09IFwid2luMzJcIikge1xuICAgIGlmIChub3JtYWxpemVkID09PSBcIn5cIikge1xuICAgICAgbm9ybWFsaXplZCA9IG9zLmhvbWVkaXIoKTtcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aChcIn4vXCIpKSB7XG4gICAgICBub3JtYWxpemVkID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgbm9ybWFsaXplZC5zbGljZSgyKSk7XG4gICAgfSBlbHNlIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCIkSE9NRS9cIikpIHtcbiAgICAgIG5vcm1hbGl6ZWQgPSBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCBub3JtYWxpemVkLnNsaWNlKFwiJEhPTUUvXCIubGVuZ3RoKSk7XG4gICAgfVxuICAgIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkLnJlcGxhY2UoL1xcXFwoWyAhIyQmJygpKjs8Pj9AW1xcXV5ge3x9fl0pL2csIFwiJDFcIik7XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZWQ7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUFic29sdXRlUGF0aCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodmFsdWUpO1xuICBpZiAodHJpbW1lZC5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IGlzIHJlcXVpcmVkLmApO1xuICB9XG4gIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IGJlIGFuIGFic29sdXRlIHBhdGguYCk7XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZUFic29sdXRlUGF0aCh0cmltbWVkKTtcbn1cblxuZnVuY3Rpb24gdG9WYXVsdFJlbGF0aXZlUGF0aCh2YXVsdFJvb3Q6IHN0cmluZywgYWJzb2x1dGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gbm9ybWFsaXplUGF0aChwYXRoLnJlbGF0aXZlKHZhdWx0Um9vdCwgYWJzb2x1dGVQYXRoKS5zcGxpdChwYXRoLnNlcCkuam9pbihcIi9cIikpO1xufVxuXG5mdW5jdGlvbiBjbGVhblRhZ0lucHV0KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdChcIixcIilcbiAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpKVxuICAgIC5maWx0ZXIoKGVudHJ5LCBpbmRleCwgaXRlbXMpID0+IGVudHJ5Lmxlbmd0aCA+IDAgJiYgaXRlbXMuaW5kZXhPZihlbnRyeSkgPT09IGluZGV4KTtcbn1cblxuZnVuY3Rpb24gam9pblRhZ1ZhbHVlcyhleGlzdGluZzogc3RyaW5nW10sIGFkZGl0aW9uczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB0YWcgb2YgWy4uLmV4aXN0aW5nLCAuLi5hZGRpdGlvbnNdKSB7XG4gICAgY29uc3QgY2xlYW4gPSB0YWcudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpO1xuICAgIGlmIChjbGVhbi5sZW5ndGggPiAwKSB7XG4gICAgICBub3JtYWxpemVkLmFkZChjbGVhbik7XG4gICAgfVxuICB9XG4gIHJldHVybiBbLi4ubm9ybWFsaXplZF07XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RGcm9udG1hdHRlclJhbmdlKGNvbnRlbnQ6IHN0cmluZyk6IHsgcmFuZ2U6IFtudW1iZXIsIG51bWJlcl07IGJvZHk6IHN0cmluZyB9IHwgbnVsbCB8IFwiaW52YWxpZFwiIHtcbiAgaWYgKCFjb250ZW50LnN0YXJ0c1dpdGgoXCItLS1cXG5cIikgJiYgIWNvbnRlbnQuc3RhcnRzV2l0aChcIi0tLVxcclxcblwiKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1hdGNoZXIgPSAvXi0tLVxccj9cXG4oW1xcc1xcU10qPylcXHI/XFxuLS0tXFxyP1xcbj8vO1xuICBjb25zdCBtYXRjaCA9IGNvbnRlbnQubWF0Y2gobWF0Y2hlcik7XG4gIGlmICghbWF0Y2ggfHwgbWF0Y2guaW5kZXggIT09IDApIHtcbiAgICByZXR1cm4gXCJpbnZhbGlkXCI7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICByYW5nZTogWzAsIG1hdGNoWzBdLmxlbmd0aF0sXG4gICAgYm9keTogbWF0Y2hbMV0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEV4aXN0aW5nVGFnRm9ybWF0dGluZyhmcm9udG1hdHRlckJvZHk6IHN0cmluZyk6IFwiYXJyYXlcIiB8IFwiY29tbWFcIiB8IFwic3BhY2VcIiB8IFwic3RyaW5nXCIgfCBcInVua25vd25cIiB7XG4gIGNvbnN0IHRhZ3NMaW5lID0gZnJvbnRtYXR0ZXJCb2R5Lm1hdGNoKC9edGFnczpcXHMqKC4rKSQvbSk7XG4gIGlmICghdGFnc0xpbmUpIHtcbiAgICBpZiAoL150YWdzOlxccyokL20udGVzdChmcm9udG1hdHRlckJvZHkpIHx8IC9edGFnczpcXHMqXFxyP1xcbi9tLnRlc3QoZnJvbnRtYXR0ZXJCb2R5KSkge1xuICAgICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgICB9XG4gICAgcmV0dXJuIFwidW5rbm93blwiO1xuICB9XG4gIGNvbnN0IHZhbHVlID0gdGFnc0xpbmVbMV0udHJpbSgpO1xuICBpZiAodmFsdWUuc3RhcnRzV2l0aChcIltcIikpIHtcbiAgICByZXR1cm4gXCJhcnJheVwiO1xuICB9XG4gIGlmICh2YWx1ZS5pbmNsdWRlcyhcIixcIikpIHtcbiAgICByZXR1cm4gXCJjb21tYVwiO1xuICB9XG4gIGlmICgvXFxzLy50ZXN0KHZhbHVlKSkge1xuICAgIHJldHVybiBcInNwYWNlXCI7XG4gIH1cbiAgcmV0dXJuIFwic3RyaW5nXCI7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RFeGlzdGluZ1RhZ3ModmFsdWU6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZVxuICAgICAgLm1hcCgoZW50cnkpID0+ICh0eXBlb2YgZW50cnkgPT09IFwic3RyaW5nXCIgPyBlbnRyeSA6IFN0cmluZyhlbnRyeSA/PyBcIlwiKSkpXG4gICAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpKVxuICAgICAgLmZpbHRlcigoZW50cnkpID0+IGVudHJ5Lmxlbmd0aCA+IDApO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBzZXBhcmF0b3IgPSB2YWx1ZS5pbmNsdWRlcyhcIixcIikgPyBcIixcIiA6IC9cXHMrLztcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgIC5zcGxpdChzZXBhcmF0b3IpXG4gICAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudHJpbSgpLnJlcGxhY2UoL14jKy8sIFwiXCIpKVxuICAgICAgLmZpbHRlcigoZW50cnkpID0+IGVudHJ5Lmxlbmd0aCA+IDApO1xuICB9XG4gIHJldHVybiBbXTtcbn1cblxuZnVuY3Rpb24gaXNNYXJrZG93bkZpbGUoZmlsZTogVEZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkgPT09IFwibWRcIjtcbn1cblxuZnVuY3Rpb24gaGFzU2VsZWN0ZWRBbmNlc3RvcihmaWxlUGF0aDogc3RyaW5nLCBzZWxlY3RlZFBhdGhzOiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBjb25zdCBwYXJ0cyA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgpLnNwbGl0KFwiL1wiKTtcbiAgZm9yIChsZXQgaW5kZXggPSAxOyBpbmRleCA8IHBhcnRzLmxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGlmIChzZWxlY3RlZFBhdGhzLmhhcyhwYXJ0cy5zbGljZSgwLCBpbmRleCkuam9pbihcIi9cIikpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5jbGFzcyBEZXN0aW5hdGlvblJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWdEaXI6IHN0cmluZykge31cblxuICBhc3luYyByZXNvbHZlKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPFJlc29sdmVkRGVzdGluYXRpb25Db25maWc+IHtcbiAgICBjb25zdCB2YXVsdFBhdGggPSBlbnN1cmVBYnNvbHV0ZVBhdGgodGFyZ2V0LnZhdWx0UGF0aCwgXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIpO1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uUGF0aCA9IGVuc3VyZUFic29sdXRlUGF0aCh0YXJnZXQuZGVzdGluYXRpb25QYXRoLCBcIkRlc3RpbmF0aW9uIHBhdGhcIik7XG4gICAgY29uc3QgZWZmZWN0aXZlQXR0YWNobWVudFBhdGggPSB0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvblxuICAgICAgPyBhd2FpdCB0aGlzLnJlc29sdmVEZWZhdWx0QXR0YWNobWVudFBhdGgodmF1bHRQYXRoKVxuICAgICAgOiBlbnN1cmVBYnNvbHV0ZVBhdGgodGFyZ2V0LmF0dGFjaG1lbnRQYXRoLCBcIkF0dGFjaG1lbnQgcGF0aFwiKTtcblxuICAgIGF3YWl0IHRoaXMuYXNzZXJ0RGlyZWN0b3J5RXhpc3RzKHZhdWx0UGF0aCwgXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoXCIpO1xuICAgIHRoaXMuYXNzZXJ0SW5zaWRlVmF1bHQodmF1bHRQYXRoLCBkZXN0aW5hdGlvblBhdGgsIFwiRGVzdGluYXRpb24gcGF0aFwiKTtcbiAgICB0aGlzLmFzc2VydEluc2lkZVZhdWx0KHZhdWx0UGF0aCwgZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsIFwiQXR0YWNobWVudCBwYXRoXCIpO1xuICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RpbmF0aW9uUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgZnMubWtkaXIoZWZmZWN0aXZlQXR0YWNobWVudFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnRhcmdldCxcbiAgICAgIHZhdWx0UGF0aCxcbiAgICAgIGRlc3RpbmF0aW9uUGF0aCxcbiAgICAgIGVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoLFxuICAgICAgYXR0YWNobWVudFBhdGg6IHRhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCksXG4gICAgfTtcbiAgfVxuXG4gIHZhbGlkYXRlKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRyaW1tZWRWYXVsdFBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC52YXVsdFBhdGgpO1xuICAgIGNvbnN0IHRyaW1tZWREZXN0aW5hdGlvblBhdGggPSBub3JtYWxpemVDb25maWd1cmVkUGF0aElucHV0KHRhcmdldC5kZXN0aW5hdGlvblBhdGgpO1xuICAgIGNvbnN0IHRyaW1tZWRBdHRhY2htZW50UGF0aCA9IG5vcm1hbGl6ZUNvbmZpZ3VyZWRQYXRoSW5wdXQodGFyZ2V0LmF0dGFjaG1lbnRQYXRoKTtcblxuICAgIGlmICh0cmltbWVkVmF1bHRQYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiB2YXVsdCBwYXRoIGlzIHJlcXVpcmVkLlwiKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoLmlzQWJzb2x1dGUodHJpbW1lZFZhdWx0UGF0aCkpIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gdmF1bHQgcGF0aCBtdXN0IGJlIGFic29sdXRlLlwiKTtcbiAgICB9XG5cbiAgICBpZiAodHJpbW1lZERlc3RpbmF0aW9uUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKFwiRGVzdGluYXRpb24gcGF0aCBpcyByZXF1aXJlZC5cIik7XG4gICAgfSBlbHNlIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWREZXN0aW5hdGlvblBhdGgpKSB7XG4gICAgICBlcnJvcnMucHVzaChcIkRlc3RpbmF0aW9uIHBhdGggbXVzdCBiZSBhYnNvbHV0ZS5cIik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmlzQWJzb2x1dGUodHJpbW1lZFZhdWx0UGF0aCkgJiYgIXRoaXMuaXNJbnNpZGVWYXVsdCh0cmltbWVkVmF1bHRQYXRoLCB0cmltbWVkRGVzdGluYXRpb25QYXRoKSkge1xuICAgICAgZXJyb3JzLnB1c2goXCJEZXN0aW5hdGlvbiBwYXRoIG11c3QgYmUgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdC5cIik7XG4gICAgfVxuXG4gICAgaWYgKCF0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbikge1xuICAgICAgaWYgKHRyaW1tZWRBdHRhY2htZW50UGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggaXMgcmVxdWlyZWQgd2hlbiBhdXRvbWF0aWMgYXR0YWNobWVudCBkZXRlY3Rpb24gaXMgZGlzYWJsZWQuXCIpO1xuICAgICAgfSBlbHNlIGlmICghcGF0aC5pc0Fic29sdXRlKHRyaW1tZWRBdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggbXVzdCBiZSBhYnNvbHV0ZS5cIik7XG4gICAgICB9IGVsc2UgaWYgKHBhdGguaXNBYnNvbHV0ZSh0cmltbWVkVmF1bHRQYXRoKSAmJiAhdGhpcy5pc0luc2lkZVZhdWx0KHRyaW1tZWRWYXVsdFBhdGgsIHRyaW1tZWRBdHRhY2htZW50UGF0aCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXCJBdHRhY2htZW50IHBhdGggbXVzdCBiZSBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LlwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JzO1xuICB9XG5cbiAgYXN5bmMgcmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aCh2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFZhdWx0UGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aCh2YXVsdFBhdGgpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwYXRoLmpvaW4obm9ybWFsaXplZFZhdWx0UGF0aCwgdGhpcy5jb25maWdEaXIsIFwiYXBwLmpzb25cIik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGNvbmZpZ1BhdGgsIFwidXRmOFwiKTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KSBhcyB7IGF0dGFjaG1lbnRGb2xkZXJQYXRoPzogc3RyaW5nIH07XG4gICAgICBjb25zdCBhdHRhY2htZW50Rm9sZGVyUGF0aCA9IHBhcnNlZC5hdHRhY2htZW50Rm9sZGVyUGF0aD8udHJpbSgpO1xuICAgICAgaWYgKCFhdHRhY2htZW50Rm9sZGVyUGF0aCkge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplZFZhdWx0UGF0aDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc29sdmVkID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHBhdGgucmVzb2x2ZShub3JtYWxpemVkVmF1bHRQYXRoLCBhdHRhY2htZW50Rm9sZGVyUGF0aCkpO1xuICAgICAgaWYgKCF0aGlzLmlzSW5zaWRlVmF1bHQobm9ybWFsaXplZFZhdWx0UGF0aCwgcmVzb2x2ZWQpKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVkVmF1bHRQYXRoO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRWYXVsdFBhdGg7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhc3NlcnREaXJlY3RvcnlFeGlzdHMoZGlyZWN0b3J5UGF0aDogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5zdGF0KGRpcmVjdG9yeVBhdGgpO1xuICAgICAgaWYgKCFzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IHBvaW50IHRvIGEgZGlyZWN0b3J5LmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSBcIkVOT0VOVFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzc2VydEluc2lkZVZhdWx0KHZhdWx0UGF0aDogc3RyaW5nLCBjYW5kaWRhdGVQYXRoOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNJbnNpZGVWYXVsdCh2YXVsdFBhdGgsIGNhbmRpZGF0ZVBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IG11c3QgYmUgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGlzSW5zaWRlVmF1bHQodmF1bHRQYXRoOiBzdHJpbmcsIGNhbmRpZGF0ZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZShub3JtYWxpemVBYnNvbHV0ZVBhdGgodmF1bHRQYXRoKSwgbm9ybWFsaXplQWJzb2x1dGVQYXRoKGNhbmRpZGF0ZVBhdGgpKTtcbiAgICByZXR1cm4gIShyZWxhdGl2ZS5zdGFydHNXaXRoKFwiLi5cIikgfHwgcGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlKSk7XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNmZXJQbGFubmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRyYW5zVmF1bHRQbHVnaW4sIHByaXZhdGUgcmVhZG9ubHkgZGVzdGluYXRpb25SZXNvbHZlcjogRGVzdGluYXRpb25SZXNvbHZlcikge31cblxuICBhc3luYyBwcmVwYXJlKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCB0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogUHJvbWlzZTxQcmVwYXJlZFRyYW5zZmVyUGxhbj4ge1xuICAgIGNvbnN0IHNvdXJjZVZhdWx0Um9vdCA9IHRoaXMuZ2V0U291cmNlVmF1bHRSb290KCk7XG4gICAgY29uc3QgcmVzb2x2ZWRUYXJnZXQgPSBhd2FpdCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIucmVzb2x2ZSh0YXJnZXQpO1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLm5vcm1hbGl6ZVNlbGVjdGlvbihzZWxlY3Rpb24pO1xuICAgIGNvbnN0IGV4cGxpY2l0RmlsZXMgPSB0aGlzLmNvbGxlY3RFeHBsaWNpdEZpbGVzKG5vcm1hbGl6ZWRTZWxlY3Rpb24pO1xuXG4gICAgaWYgKGV4cGxpY2l0RmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgc2VsZWN0aW9uIGRvZXMgbm90IGNvbnRhaW4gYW55IGZpbGVzIHRvIHRyYW5zZmVyLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBsaWNpdE1hcmtkb3duRmlsZXMgPSBleHBsaWNpdEZpbGVzLm1hcCgoZW50cnkpID0+IGVudHJ5LmZpbGUpLmZpbHRlcihpc01hcmtkb3duRmlsZSk7XG4gICAgY29uc3QgcmV2aWV3Um9vdHM6IFJldmlld05vZGVbXSA9IFtdO1xuICAgIGNvbnN0IGRpcmVjdERlcGVuZGVuY2llcyA9IG5ldyBNYXA8c3RyaW5nLCBEaXJlY3REZXBlbmRlbmNpZXM+KCk7XG4gICAgY29uc3QgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgY29uc3QgcmVsYXRpb25zaGlwc0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIERpcmVjdFJlbGF0aW9uc2hpcHM+KCk7XG5cbiAgICBjb25zdCBnZXRSZWxhdGlvbnNoaXBzID0gKGZpbGU6IFRGaWxlKTogRGlyZWN0UmVsYXRpb25zaGlwcyA9PiB7XG4gICAgICBjb25zdCBjYWNoZWQgPSByZWxhdGlvbnNoaXBzQ2FjaGUuZ2V0KGZpbGUucGF0aCk7XG4gICAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgIHJldHVybiBjYWNoZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCByZWxhdGlvbnNoaXBzID0gdGhpcy5jb2xsZWN0RGlyZWN0UmVsYXRpb25zaGlwcyhmaWxlKTtcbiAgICAgIHJlbGF0aW9uc2hpcHNDYWNoZS5zZXQoZmlsZS5wYXRoLCByZWxhdGlvbnNoaXBzKTtcbiAgICAgIGRpcmVjdERlcGVuZGVuY2llcy5zZXQoZmlsZS5wYXRoLCB7XG4gICAgICAgIG1hcmtkb3duOiByZWxhdGlvbnNoaXBzLm1hcmtkb3duLFxuICAgICAgICBhdHRhY2htZW50czogcmVsYXRpb25zaGlwcy5hdHRhY2htZW50cyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcHM7XG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBleHBsaWNpdE1hcmtkb3duRmlsZXMpIHtcbiAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBnZXRSZWxhdGlvbnNoaXBzKGZpbGUpO1xuICAgICAgZGlyZWN0TWFya2Rvd25SZWxhdGlvbnMuc2V0KGZpbGUucGF0aCwgbmV3IFNldDxzdHJpbmc+KFtcbiAgICAgICAgLi4ucmVsYXRpb25zaGlwcy5tYXJrZG93bixcbiAgICAgICAgLi4ucmVsYXRpb25zaGlwcy5iYWNrbGlua3MsXG4gICAgICBdKSk7XG5cbiAgICAgIGNvbnN0IGdyb3VwczogUmV2aWV3Tm9kZVtdID0gdGhpcy5jcmVhdGVBdHRhY2htZW50R3JvdXAoZmlsZS5wYXRoLCBmaWxlLnBhdGgsIGdldFJlbGF0aW9uc2hpcHMpO1xuICAgICAgaWYgKHJlbGF0aW9uc2hpcHMubWFya2Rvd24uc2l6ZSA+IDApIHtcbiAgICAgICAgZ3JvdXBzLnB1c2goe1xuICAgICAgICAgIGlkOiBgJHtmaWxlLnBhdGh9Ojp0by1ncm91cGAsXG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIGxhYmVsOiBcImxpbmtzIHRvXCIsXG4gICAgICAgICAgZGlyZWN0aW9uOiBcInRvXCIsXG4gICAgICAgICAgY2hpbGRyZW46IFsuLi5yZWxhdGlvbnNoaXBzLm1hcmtkb3duXVxuICAgICAgICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKVxuICAgICAgICAgICAgLm1hcCgobm90ZVBhdGgpID0+IHRoaXMuY3JlYXRlTm90ZU5vZGUoZmlsZS5wYXRoLCBcInRvXCIsIG5vdGVQYXRoLCBnZXRSZWxhdGlvbnNoaXBzKSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHJlbGF0aW9uc2hpcHMuYmFja2xpbmtzLnNpemUgPiAwKSB7XG4gICAgICAgIGdyb3Vwcy5wdXNoKHtcbiAgICAgICAgICBpZDogYCR7ZmlsZS5wYXRofTo6ZnJvbS1ncm91cGAsXG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIGxhYmVsOiBcImxpbmtzIGZyb21cIixcbiAgICAgICAgICBkaXJlY3Rpb246IFwiZnJvbVwiLFxuICAgICAgICAgIGNoaWxkcmVuOiBbLi4ucmVsYXRpb25zaGlwcy5iYWNrbGlua3NdXG4gICAgICAgICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpXG4gICAgICAgICAgICAubWFwKChub3RlUGF0aCkgPT4gdGhpcy5jcmVhdGVOb3RlTm9kZShmaWxlLnBhdGgsIFwiZnJvbVwiLCBub3RlUGF0aCwgZ2V0UmVsYXRpb25zaGlwcykpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldmlld1Jvb3RzLnB1c2goe1xuICAgICAgICBpZDogYCR7ZmlsZS5wYXRofTo6cm9vdGAsXG4gICAgICAgIHR5cGU6IFwibm90ZVwiLFxuICAgICAgICBsYWJlbDogZmlsZS5iYXNlbmFtZSxcbiAgICAgICAgZmlsZVBhdGg6IGZpbGUucGF0aCxcbiAgICAgICAgY2hpbGRyZW46IGdyb3VwcyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2VWYXVsdFJvb3QsXG4gICAgICB0YXJnZXQ6IHJlc29sdmVkVGFyZ2V0LFxuICAgICAgZXhwbGljaXRGaWxlcyxcbiAgICAgIGV4cGxpY2l0TWFya2Rvd25QYXRoczogZXhwbGljaXRNYXJrZG93bkZpbGVzLm1hcCgoZmlsZSkgPT4gZmlsZS5wYXRoKSxcbiAgICAgIHNlbGVjdGVkRm9sZGVyUGF0aHM6IG5vcm1hbGl6ZWRTZWxlY3Rpb24uZmlsdGVyKChlbnRyeSk6IGVudHJ5IGlzIFRGb2xkZXIgPT4gZW50cnkgaW5zdGFuY2VvZiBURm9sZGVyKS5tYXAoKGZvbGRlcikgPT4gZm9sZGVyLnBhdGgpLFxuICAgICAgcmV2aWV3Um9vdHMsXG4gICAgICBkaXJlY3REZXBlbmRlbmNpZXMsXG4gICAgICBkaXJlY3RNYXJrZG93blJlbGF0aW9ucyxcbiAgICB9O1xuICB9XG5cbiAgbm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogVEFic3RyYWN0RmlsZVtdIHtcbiAgICBjb25zdCB1bmlxdWUgPSBuZXcgTWFwPHN0cmluZywgVEFic3RyYWN0RmlsZT4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHNlbGVjdGlvbikge1xuICAgICAgdW5pcXVlLnNldChub3JtYWxpemVQYXRoKGVudHJ5LnBhdGgpLCBlbnRyeSk7XG4gICAgfVxuICAgIGNvbnN0IHNlbGVjdGVkUGF0aHMgPSBuZXcgU2V0KHVuaXF1ZS5rZXlzKCkpO1xuICAgIHJldHVybiBbLi4udW5pcXVlLnZhbHVlcygpXS5maWx0ZXIoKGVudHJ5KSA9PiAhaGFzU2VsZWN0ZWRBbmNlc3RvcihlbnRyeS5wYXRoLCBzZWxlY3RlZFBhdGhzKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFNvdXJjZVZhdWx0Um9vdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlcjtcbiAgICBpZiAoIShhZGFwdGVyIGluc3RhbmNlb2YgRmlsZVN5c3RlbUFkYXB0ZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUcmFucyBWYXVsdCByZXF1aXJlcyBhIGRlc2t0b3AgZmlsZSBzeXN0ZW0gYWRhcHRlci5cIik7XG4gICAgfVxuICAgIHJldHVybiBub3JtYWxpemVBYnNvbHV0ZVBhdGgoYWRhcHRlci5nZXRCYXNlUGF0aCgpKTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEV4cGxpY2l0RmlsZXMoc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiBFeHBsaWNpdEZpbGVTZWxlY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwbGljaXRGaWxlczogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHNlbGVjdGlvbikge1xuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgZXhwbGljaXRGaWxlcy5wdXNoKHtcbiAgICAgICAgICBmaWxlOiBlbnRyeSxcbiAgICAgICAgICBkZXN0aW5hdGlvblJlbGF0aXZlUGF0aDogcGF0aC5wb3NpeC5iYXNlbmFtZShub3JtYWxpemVQYXRoKGVudHJ5LnBhdGgpKSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICB0aGlzLmNvbGxlY3RGb2xkZXJGaWxlcyhlbnRyeSwgZW50cnksIGV4cGxpY2l0RmlsZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwbGljaXRGaWxlcztcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEZvbGRlckZpbGVzKGZvbGRlcjogVEZvbGRlciwgcm9vdEZvbGRlcjogVEZvbGRlciwgc2luazogRXhwbGljaXRGaWxlU2VsZWN0aW9uW10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGZvbGRlci5jaGlsZHJlbikge1xuICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVJbnNpZGVSb290ID0gcGF0aC5wb3NpeC5yZWxhdGl2ZShub3JtYWxpemVQYXRoKHJvb3RGb2xkZXIucGF0aCksIG5vcm1hbGl6ZVBhdGgoY2hpbGQucGF0aCkpO1xuICAgICAgICBzaW5rLnB1c2goe1xuICAgICAgICAgIGZpbGU6IGNoaWxkLFxuICAgICAgICAgIGRlc3RpbmF0aW9uUmVsYXRpdmVQYXRoOiBub3JtYWxpemVQYXRoKHBhdGgucG9zaXguam9pbihyb290Rm9sZGVyLm5hbWUsIHJlbGF0aXZlSW5zaWRlUm9vdCkpLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoY2hpbGQgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdEZvbGRlckZpbGVzKGNoaWxkLCByb290Rm9sZGVyLCBzaW5rKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU5vdGVOb2RlKFxuICAgIHJvb3RQYXRoOiBzdHJpbmcsXG4gICAgZGlyZWN0aW9uOiBSZXZpZXdEaXJlY3Rpb24sXG4gICAgbm90ZVBhdGg6IHN0cmluZyxcbiAgICBnZXRSZWxhdGlvbnNoaXBzOiAoZmlsZTogVEZpbGUpID0+IERpcmVjdFJlbGF0aW9uc2hpcHMsXG4gICk6IFJldmlld05vZGUge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChub3RlUGF0aCk7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBmaWxlICYmIGlzTWFya2Rvd25GaWxlKGZpbGUpXG4gICAgICA/IHRoaXMuY3JlYXRlQXR0YWNobWVudEdyb3VwKGAke3Jvb3RQYXRofTo6JHtkaXJlY3Rpb259Ojoke25vdGVQYXRofWAsIGZpbGUucGF0aCwgZ2V0UmVsYXRpb25zaGlwcylcbiAgICAgIDogW107XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBgJHtyb290UGF0aH06OiR7ZGlyZWN0aW9ufTo6JHtub3RlUGF0aH1gLFxuICAgICAgdHlwZTogXCJub3RlXCIsXG4gICAgICBsYWJlbDogZmlsZT8uYmFzZW5hbWUgPz8gcGF0aC5wb3NpeC5iYXNlbmFtZShub3RlUGF0aCwgXCIubWRcIiksXG4gICAgICBmaWxlUGF0aDogbm90ZVBhdGgsXG4gICAgICBjaGlsZHJlbixcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVBdHRhY2htZW50R3JvdXAoXG4gICAgYnJhbmNoSWQ6IHN0cmluZyxcbiAgICBub3RlUGF0aDogc3RyaW5nLFxuICAgIGdldFJlbGF0aW9uc2hpcHM6IChmaWxlOiBURmlsZSkgPT4gRGlyZWN0UmVsYXRpb25zaGlwcyxcbiAgKTogUmV2aWV3Tm9kZVtdIHtcbiAgICBjb25zdCBub3RlRmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKG5vdGVQYXRoKTtcbiAgICBpZiAoIW5vdGVGaWxlIHx8ICFpc01hcmtkb3duRmlsZShub3RlRmlsZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IGdldFJlbGF0aW9uc2hpcHMobm90ZUZpbGUpO1xuICAgIGlmIChyZWxhdGlvbnNoaXBzLmF0dGFjaG1lbnRzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIFt7XG4gICAgICBpZDogYCR7YnJhbmNoSWR9OjphdHRhY2htZW50cy1ncm91cGAsXG4gICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICBsYWJlbDogXCJhdHRhY2htZW50c1wiLFxuICAgICAgY2hpbGRyZW46IFsuLi5yZWxhdGlvbnNoaXBzLmF0dGFjaG1lbnRzXVxuICAgICAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpXG4gICAgICAgIC5tYXAoKGF0dGFjaG1lbnRQYXRoKSA9PiB0aGlzLmNyZWF0ZUF0dGFjaG1lbnROb2RlKGJyYW5jaElkLCBhdHRhY2htZW50UGF0aCkpLFxuICAgIH1dO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVBdHRhY2htZW50Tm9kZShicmFuY2hJZDogc3RyaW5nLCBhdHRhY2htZW50UGF0aDogc3RyaW5nKTogUmV2aWV3Tm9kZSB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGF0dGFjaG1lbnRQYXRoKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGAke2JyYW5jaElkfTo6YXR0YWNobWVudDo6JHthdHRhY2htZW50UGF0aH1gLFxuICAgICAgdHlwZTogXCJhdHRhY2htZW50XCIsXG4gICAgICBsYWJlbDogZmlsZT8ubmFtZSA/PyBwYXRoLnBvc2l4LmJhc2VuYW1lKGF0dGFjaG1lbnRQYXRoKSxcbiAgICAgIGZpbGVQYXRoOiBhdHRhY2htZW50UGF0aCxcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0RGlyZWN0UmVsYXRpb25zaGlwcyhmaWxlOiBURmlsZSk6IERpcmVjdFJlbGF0aW9uc2hpcHMge1xuICAgIGNvbnN0IG1hcmtkb3duID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgYXR0YWNobWVudHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBjYWNoZSA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiBbLi4uKGNhY2hlPy5saW5rcyA/PyBbXSksIC4uLihjYWNoZT8uZW1iZWRzID8/IFtdKSwgLi4uKGNhY2hlPy5mcm9udG1hdHRlckxpbmtzID8/IFtdKV0pIHtcbiAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gdGhpcy5wbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZ2V0TGlua3BhdGgocmVmLmxpbmspLCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKCEoZGVzdGluYXRpb24gaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoaXNNYXJrZG93bkZpbGUoZGVzdGluYXRpb24pKSB7XG4gICAgICAgIG1hcmtkb3duLmFkZChkZXN0aW5hdGlvbi5wYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dGFjaG1lbnRzLmFkZChkZXN0aW5hdGlvbi5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBiYWNrbGlua3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCByZXNvbHZlZExpbmtzID0gKHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlIGFzIHVua25vd24gYXMge1xuICAgICAgcmVzb2x2ZWRMaW5rcz86IFJlY29yZDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIG51bWJlcj4+O1xuICAgIH0pLnJlc29sdmVkTGlua3MgPz8ge307XG4gICAgZm9yIChjb25zdCBbc291cmNlUGF0aCwgdGFyZ2V0c10gb2YgT2JqZWN0LmVudHJpZXMocmVzb2x2ZWRMaW5rcykpIHtcbiAgICAgIGlmICghdGFyZ2V0c1tmaWxlLnBhdGhdKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHNvdXJjZVBhdGgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgJiYgaXNNYXJrZG93bkZpbGUoc291cmNlRmlsZSkpIHtcbiAgICAgICAgYmFja2xpbmtzLmFkZChzb3VyY2VQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWFya2Rvd24sXG4gICAgICBiYWNrbGlua3MsXG4gICAgICBhdHRhY2htZW50cyxcbiAgICB9O1xuICB9XG59XG5cbmNsYXNzIFRyYW5zZmVyRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogVHJhbnNWYXVsdFBsdWdpbikge31cblxuICBhc3luYyBleGVjdXRlKHBsYW46IFByZXBhcmVkVHJhbnNmZXJQbGFuLCBtb2RlOiBUcmFuc2Zlck1vZGUsIGNvbmZpcm1lZFNlbGVjdGlvblBhdGhzPzogc3RyaW5nW10pOiBQcm9taXNlPFRyYW5zZmVyU3VtbWFyeT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkUmV2aWV3UGF0aHMgPSBjb25maXJtZWRTZWxlY3Rpb25QYXRoc1xuICAgICAgPyBuZXcgU2V0PHN0cmluZz4oY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBzZWxlY3RlZE1hcmtkb3duUGF0aHMgPSBzZWxlY3RlZFJldmlld1BhdGhzXG4gICAgICA/IG5ldyBTZXQ8c3RyaW5nPihbLi4uc2VsZWN0ZWRSZXZpZXdQYXRoc10uZmlsdGVyKChlbnRyeSkgPT4gdGhpcy5pc1NlbGVjdGVkTWFya2Rvd25QYXRoKGVudHJ5KSkpXG4gICAgICA6IG5ldyBTZXQ8c3RyaW5nPihwbGFuLmV4cGxpY2l0TWFya2Rvd25QYXRocyk7XG5cbiAgICBjb25zdCBkcmFmdEVudHJpZXMgPSBuZXcgTWFwPHN0cmluZywgRHJhZnRUcmFuc2ZlckVudHJ5PigpO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwbGFuLmV4cGxpY2l0RmlsZXMpIHtcbiAgICAgIGlmIChpc01hcmtkb3duRmlsZShlbnRyeS5maWxlKSAmJiAhc2VsZWN0ZWRNYXJrZG93blBhdGhzLmhhcyhlbnRyeS5maWxlLnBhdGgpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZHJhZnRFbnRyaWVzLnNldChcbiAgICAgICAgZW50cnkuZmlsZS5wYXRoLFxuICAgICAgICB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgZW50cnkuZmlsZSwgdHJ1ZSwgZW50cnkuZGVzdGluYXRpb25SZWxhdGl2ZVBhdGgpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG1hcmtkb3duUGF0aCBvZiBzZWxlY3RlZE1hcmtkb3duUGF0aHMpIHtcbiAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKG1hcmtkb3duUGF0aCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXJrZG93bkZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChtYXJrZG93blBhdGgpO1xuICAgICAgaWYgKG1hcmtkb3duRmlsZSAmJiBpc01hcmtkb3duRmlsZShtYXJrZG93bkZpbGUpKSB7XG4gICAgICAgIGRyYWZ0RW50cmllcy5zZXQobWFya2Rvd25QYXRoLCB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgbWFya2Rvd25GaWxlLCBmYWxzZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxlY3RlZFJldmlld1BhdGhzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNlbGVjdGVkUGF0aCBvZiBzZWxlY3RlZFJldmlld1BhdGhzKSB7XG4gICAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKHNlbGVjdGVkUGF0aCkgfHwgc2VsZWN0ZWRNYXJrZG93blBhdGhzLmhhcyhzZWxlY3RlZFBhdGgpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoc2VsZWN0ZWRQYXRoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkRmlsZSAmJiAhaXNNYXJrZG93bkZpbGUoc2VsZWN0ZWRGaWxlKSkge1xuICAgICAgICAgIGRyYWZ0RW50cmllcy5zZXQoc2VsZWN0ZWRQYXRoLCB0aGlzLmNyZWF0ZURyYWZ0RW50cnkocGxhbiwgc2VsZWN0ZWRGaWxlLCBmYWxzZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcykge1xuICAgICAgZm9yIChjb25zdCBtYXJrZG93blBhdGggb2Ygc2VsZWN0ZWRNYXJrZG93blBhdGhzKSB7XG4gICAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IHBsYW4uZGlyZWN0RGVwZW5kZW5jaWVzLmdldChtYXJrZG93blBhdGgpO1xuICAgICAgICBpZiAoIWRlcGVuZGVuY2llcykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYXR0YWNobWVudFBhdGggb2YgZGVwZW5kZW5jaWVzLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdGVkUmV2aWV3UGF0aHMgJiYgIXNlbGVjdGVkUmV2aWV3UGF0aHMuaGFzKGF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkcmFmdEVudHJpZXMuaGFzKGF0dGFjaG1lbnRQYXRoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGF0dGFjaG1lbnRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoYXR0YWNobWVudFBhdGgpO1xuICAgICAgICAgIGlmIChhdHRhY2htZW50RmlsZSkge1xuICAgICAgICAgICAgZHJhZnRFbnRyaWVzLnNldChhdHRhY2htZW50UGF0aCwgdGhpcy5jcmVhdGVEcmFmdEVudHJ5KHBsYW4sIGF0dGFjaG1lbnRGaWxlLCBmYWxzZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHN1bW1hcnk6IFRyYW5zZmVyU3VtbWFyeSA9IHtcbiAgICAgIHJlcXVlc3RlZEZpbGVDb3VudDogZHJhZnRFbnRyaWVzLnNpemUsXG4gICAgICB0cmFuc2ZlcnJlZEZpbGVDb3VudDogMCxcbiAgICAgIG1vdmVkRmlsZUNvdW50OiAwLFxuICAgICAgc2tpcHBlZENvbmZsaWN0Q291bnQ6IDAsXG4gICAgICByZW5hbWVkQ291bnQ6IDAsXG4gICAgICBmYWlsZWRDb3VudDogMCxcbiAgICAgIHNraXBwZWRFbnRyaWVzOiBbXSxcbiAgICAgIHdhcm5pbmdzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzb2x2ZWRFbnRyaWVzID0gYXdhaXQgdGhpcy5yZXNvbHZlQ29uZmxpY3RzKHBsYW4sIFsuLi5kcmFmdEVudHJpZXMudmFsdWVzKCldLCBzdW1tYXJ5KTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiByZXNvbHZlZEVudHJpZXMpIHtcbiAgICAgIGRlc3RpbmF0aW9uTWFwLnNldChlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCwgZW50cnkuZGVzdGluYXRpb25WYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHJhbnNmZXJyZWRGaWxlczogVEZpbGVbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzb2x2ZWRFbnRyaWVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmRpcm5hbWUoZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKGVudHJ5Lm92ZXJ3cml0ZUV4aXN0aW5nKSB7XG4gICAgICAgICAgYXdhaXQgZnMucm0oZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbnRyeS5zaG91bGRSZXdyaXRlTGlua3MpIHtcbiAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5jYWNoZWRSZWFkKGVudHJ5LnNvdXJjZUZpbGUpO1xuICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLnJld3JpdGVNYXJrZG93bkxpbmtzKGNvbnRlbnQsIGVudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoLCBlbnRyeS5kZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBkZXN0aW5hdGlvbk1hcCk7XG4gICAgICAgICAgY29uc3QgdGFnUmVzdWx0ID0gdGhpcy5hcHBseURlc3RpbmF0aW9uVGFncyhjb250ZW50LCBtb2RlLCBlbnRyeS5zb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICAgICAgY29udGVudCA9IHRhZ1Jlc3VsdC5jb250ZW50O1xuICAgICAgICAgIGlmICh0YWdSZXN1bHQud2FybmluZykge1xuICAgICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKHRhZ1Jlc3VsdC53YXJuaW5nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKGVudHJ5LmRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoLCBjb250ZW50LCBcInV0ZjhcIik7XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gXCJjb3B5XCIgJiYgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBzb3VyY2VUYWdSZXN1bHQgPSBhd2FpdCB0aGlzLnRhZ1NvdXJjZU1hcmtkb3duKGVudHJ5LnNvdXJjZUZpbGUsIHRoaXMuZ2V0VGFnc0Zvck1vZGUobW9kZSkpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZVRhZ1Jlc3VsdCkge1xuICAgICAgICAgICAgICBzdW1tYXJ5Lndhcm5pbmdzLnB1c2goc291cmNlVGFnUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuY29weUZpbGUoZW50cnkuc291cmNlQWJzb2x1dGVQYXRoLCBlbnRyeS5kZXN0aW5hdGlvbkFic29sdXRlUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2ZlcnJlZEZpbGVzLnB1c2goZW50cnkuc291cmNlRmlsZSk7XG4gICAgICAgIHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgKz0gMTtcbiAgICAgICAgaWYgKGVudHJ5Lndhc1JlbmFtZWQpIHtcbiAgICAgICAgICBzdW1tYXJ5LnJlbmFtZWRDb3VudCArPSAxO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5LmZhaWxlZENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIHRyYW5zZmVyICR7ZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGh9OiAke3RoaXMudG9FcnJvck1lc3NhZ2UoZXJyb3IsIFwiVW5rbm93biB0cmFuc2ZlciBlcnJvci5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1vZGUgPT09IFwibW92ZVwiKSB7XG4gICAgICBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50ID0gYXdhaXQgdGhpcy5kZWxldGVNb3ZlZFNvdXJjZXModHJhbnNmZXJyZWRGaWxlcywgcGxhbi5zZWxlY3RlZEZvbGRlclBhdGhzLCBzdW1tYXJ5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VtbWFyeTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRHJhZnRFbnRyeShcbiAgICBwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbixcbiAgICBmaWxlOiBURmlsZSxcbiAgICBpc0V4cGxpY2l0U2VsZWN0aW9uOiBib29sZWFuLFxuICAgIGV4cGxpY2l0RGVzdGluYXRpb25SZWxhdGl2ZVBhdGg/OiBzdHJpbmcsXG4gICk6IERyYWZ0VHJhbnNmZXJFbnRyeSB7XG4gICAgY29uc3Qgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGggPSBub3JtYWxpemVQYXRoKGZpbGUucGF0aCk7XG4gICAgY29uc3Qgc291cmNlQWJzb2x1dGVQYXRoID0gbm9ybWFsaXplQWJzb2x1dGVQYXRoKHBhdGguam9pbihwbGFuLnNvdXJjZVZhdWx0Um9vdCwgLi4uc291cmNlVmF1bHRSZWxhdGl2ZVBhdGguc3BsaXQoXCIvXCIpKSk7XG4gICAgY29uc3QgZGVzdGluYXRpb25CYXNlID0gIWlzRXhwbGljaXRTZWxlY3Rpb24gJiYgIWlzTWFya2Rvd25GaWxlKGZpbGUpXG4gICAgICA/IHBsYW4udGFyZ2V0LmVmZmVjdGl2ZUF0dGFjaG1lbnRQYXRoXG4gICAgICA6IHBsYW4udGFyZ2V0LmRlc3RpbmF0aW9uUGF0aDtcbiAgICBjb25zdCByZWxhdGl2ZURlc3RpbmF0aW9uID0gZXhwbGljaXREZXN0aW5hdGlvblJlbGF0aXZlUGF0aCA/PyBwYXRoLnBvc2l4LmJhc2VuYW1lKHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChcbiAgICAgIHBhdGguam9pbihkZXN0aW5hdGlvbkJhc2UsIC4uLm5vcm1hbGl6ZVBhdGgocmVsYXRpdmVEZXN0aW5hdGlvbikuc3BsaXQoXCIvXCIpKSxcbiAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2VGaWxlOiBmaWxlLFxuICAgICAgc291cmNlQWJzb2x1dGVQYXRoLFxuICAgICAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGgsXG4gICAgICBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCxcbiAgICAgIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHRvVmF1bHRSZWxhdGl2ZVBhdGgocGxhbi50YXJnZXQudmF1bHRQYXRoLCBkZXN0aW5hdGlvbkFic29sdXRlUGF0aCksXG4gICAgICBzaG91bGRSZXdyaXRlTGlua3M6IGlzTWFya2Rvd25GaWxlKGZpbGUpLFxuICAgICAgaXNFeHBsaWNpdFNlbGVjdGlvbixcbiAgICAgIHdhc1JlbmFtZWQ6IGZhbHNlLFxuICAgICAgb3ZlcndyaXRlRXhpc3Rpbmc6IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGlzU2VsZWN0ZWRNYXJrZG93blBhdGgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XG4gICAgcmV0dXJuICEhZmlsZSAmJiBpc01hcmtkb3duRmlsZShmaWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUNvbmZsaWN0cyhcbiAgICBwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbixcbiAgICBlbnRyaWVzOiBEcmFmdFRyYW5zZmVyRW50cnlbXSxcbiAgICBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnksXG4gICk6IFByb21pc2U8RmluYWxpemVkVHJhbnNmZXJFbnRyeVtdPiB7XG4gICAgY29uc3QgcmVzZXJ2ZWRQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHJlc29sdmVkOiBGaW5hbGl6ZWRUcmFuc2ZlckVudHJ5W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgY29uc3QgZGVzaXJlZFBhdGggPSBub3JtYWxpemVBYnNvbHV0ZVBhdGgoZW50cnkuZGVzdGluYXRpb25BYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IG5vcm1hbGl6ZUFic29sdXRlUGF0aChlbnRyeS5zb3VyY2VBYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3QgYWxyZWFkeVJlc2VydmVkID0gcmVzZXJ2ZWRQYXRocy5oYXMoZGVzaXJlZFBhdGgpO1xuICAgICAgY29uc3QgYWxyZWFkeUV4aXN0cyA9IGF3YWl0IHRoaXMucGF0aEV4aXN0cyhkZXNpcmVkUGF0aCk7XG4gICAgICBjb25zdCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbiA9IGRlc2lyZWRQYXRoID09PSBzb3VyY2VQYXRoO1xuICAgICAgY29uc3QgaGFzQ29uZmxpY3QgPSBhbHJlYWR5UmVzZXJ2ZWQgfHwgYWxyZWFkeUV4aXN0cyB8fCBzb3VyY2VFcXVhbHNEZXN0aW5hdGlvbjtcblxuICAgICAgaWYgKGhhc0NvbmZsaWN0ICYmIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbmZsaWN0U3RyYXRlZ3kgPT09IFwic2tpcFwiKSB7XG4gICAgICAgIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgKz0gMTtcbiAgICAgICAgc3VtbWFyeS5za2lwcGVkRW50cmllcy5wdXNoKGVudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICAgICAgaWYgKHNvdXJjZUVxdWFsc0Rlc3RpbmF0aW9uKSB7XG4gICAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBTa2lwcGVkICR7ZW50cnkuc291cmNlVmF1bHRSZWxhdGl2ZVBhdGh9IGJlY2F1c2Ugc291cmNlIGFuZCBkZXN0aW5hdGlvbiBhcmUgaWRlbnRpY2FsLmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgU2tpcHBlZCAke2VudHJ5LnNvdXJjZVZhdWx0UmVsYXRpdmVQYXRofSBiZWNhdXNlICR7ZGVzaXJlZFBhdGh9IGFscmVhZHkgZXhpc3RzLmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgZmluYWxQYXRoID0gZGVzaXJlZFBhdGg7XG4gICAgICBsZXQgd2FzUmVuYW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKGhhc0NvbmZsaWN0ICYmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5ID09PSBcImF1dG8tcmVuYW1lXCIgfHwgYWxyZWFkeVJlc2VydmVkIHx8IHNvdXJjZUVxdWFsc0Rlc3RpbmF0aW9uKSkge1xuICAgICAgICBmaW5hbFBhdGggPSBhd2FpdCB0aGlzLmZpbmRBdmFpbGFibGVQYXRoKGRlc2lyZWRQYXRoLCByZXNlcnZlZFBhdGhzLCBzb3VyY2VQYXRoKTtcbiAgICAgICAgd2FzUmVuYW1lZCA9IGZpbmFsUGF0aCAhPT0gZGVzaXJlZFBhdGg7XG4gICAgICB9XG5cbiAgICAgIHJlc2VydmVkUGF0aHMuYWRkKGZpbmFsUGF0aCk7XG4gICAgICByZXNvbHZlZC5wdXNoKHtcbiAgICAgICAgLi4uZW50cnksXG4gICAgICAgIGRlc3RpbmF0aW9uQWJzb2x1dGVQYXRoOiBmaW5hbFBhdGgsXG4gICAgICAgIGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGg6IHRvVmF1bHRSZWxhdGl2ZVBhdGgocGxhbi50YXJnZXQudmF1bHRQYXRoLCBmaW5hbFBhdGgpLFxuICAgICAgICB3YXNSZW5hbWVkLFxuICAgICAgICBvdmVyd3JpdGVFeGlzdGluZzogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9PT0gXCJvdmVyd3JpdGVcIiAmJiAhd2FzUmVuYW1lZCAmJiBhbHJlYWR5RXhpc3RzLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSByZXdyaXRlTWFya2Rvd25MaW5rcyhcbiAgICBjb250ZW50OiBzdHJpbmcsXG4gICAgc291cmNlVmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZyxcbiAgICBkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoOiBzdHJpbmcsXG4gICAgZGVzdGluYXRpb25NYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4sXG4gICk6IHN0cmluZyB7XG4gICAgbGV0IHJld3JpdHRlbiA9IGNvbnRlbnQucmVwbGFjZSgvKCEpP1xcW1xcWyhbXlxcXV0rKVxcXVxcXS9nLCAobWF0Y2gsIGVtYmVkUHJlZml4OiBzdHJpbmcgfCB1bmRlZmluZWQsIGlubmVyOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGFsaWFzU2VwYXJhdG9yID0gaW5uZXIuaW5kZXhPZihcInxcIik7XG4gICAgICBjb25zdCBsaW5rVGV4dCA9IGFsaWFzU2VwYXJhdG9yID49IDAgPyBpbm5lci5zbGljZSgwLCBhbGlhc1NlcGFyYXRvcikgOiBpbm5lcjtcbiAgICAgIGNvbnN0IGFsaWFzID0gYWxpYXNTZXBhcmF0b3IgPj0gMCA/IGlubmVyLnNsaWNlKGFsaWFzU2VwYXJhdG9yICsgMSkgOiBcIlwiO1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVSZWZlcmVuY2UobGlua1RleHQsIHNvdXJjZVZhdWx0UmVsYXRpdmVQYXRoKTtcbiAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFwcGVkUGF0aCA9IGRlc3RpbmF0aW9uTWFwLmdldChyZXNvbHZlZC50YXJnZXRGaWxlLnBhdGgpO1xuICAgICAgaWYgKCFtYXBwZWRQYXRoKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHRQYXRoID0gdGhpcy50b1dpa2lMaW5rUGF0aChkZXN0aW5hdGlvblZhdWx0UmVsYXRpdmVQYXRoLCBtYXBwZWRQYXRoLCByZXNvbHZlZC50YXJnZXRGaWxlLmV4dGVuc2lvbik7XG4gICAgICBjb25zdCByZWJ1aWx0ID0gYCR7bmV4dFBhdGh9JHtyZXNvbHZlZC5zdWJwYXRofSR7YWxpYXMgPyBgfCR7YWxpYXN9YCA6IFwiXCJ9YDtcbiAgICAgIHJldHVybiBgJHtlbWJlZFByZWZpeCA/PyBcIlwifVtbJHtyZWJ1aWx0fV1dYDtcbiAgICB9KTtcblxuICAgIHJld3JpdHRlbiA9IHJld3JpdHRlbi5yZXBsYWNlKC8oISk/XFxbKFteXFxdXSopXFxdXFwoKFteKV0rKVxcKS9nLCAobWF0Y2gsIGVtYmVkUHJlZml4OiBzdHJpbmcgfCB1bmRlZmluZWQsIGxhYmVsOiBzdHJpbmcsIHJhd0hyZWY6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgcGFyc2VkID0gdGhpcy5wYXJzZU1hcmtkb3duSHJlZihyYXdIcmVmKTtcbiAgICAgIGlmICghcGFyc2VkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUmVmZXJlbmNlKHBhcnNlZC5wYXRoLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hcHBlZFBhdGggPSBkZXN0aW5hdGlvbk1hcC5nZXQocmVzb2x2ZWQudGFyZ2V0RmlsZS5wYXRoKTtcbiAgICAgIGlmICghbWFwcGVkUGF0aCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCByZWxhdGl2ZUxpbmsgPSB0aGlzLnRvUmVsYXRpdmVMaW5rKGRlc3RpbmF0aW9uVmF1bHRSZWxhdGl2ZVBhdGgsIG1hcHBlZFBhdGgpO1xuICAgICAgY29uc3QgcmVidWlsdEhyZWYgPSBgJHt0aGlzLmVuY29kZU1hcmtkb3duTGlua1BhdGgocmVsYXRpdmVMaW5rKX0ke3Jlc29sdmVkLnN1YnBhdGh9YDtcbiAgICAgIGNvbnN0IHdyYXBwZWRIcmVmID0gcGFyc2VkLndyYXBwZWRJbkFuZ2xlcyA/IGA8JHtyZWJ1aWx0SHJlZn0+YCA6IHJlYnVpbHRIcmVmO1xuICAgICAgcmV0dXJuIGAke2VtYmVkUHJlZml4ID8/IFwiXCJ9WyR7bGFiZWx9XSgke3dyYXBwZWRIcmVmfSlgO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJld3JpdHRlbjtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVJlZmVyZW5jZShsaW5rVGV4dDogc3RyaW5nLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aDogc3RyaW5nKTogeyB0YXJnZXRGaWxlOiBURmlsZTsgc3VicGF0aDogc3RyaW5nIH0gfCBudWxsIHtcbiAgICBjb25zdCBoYXNoSW5kZXggPSBsaW5rVGV4dC5pbmRleE9mKFwiI1wiKTtcbiAgICBjb25zdCByYXdQYXRoID0gaGFzaEluZGV4ID49IDAgPyBsaW5rVGV4dC5zbGljZSgwLCBoYXNoSW5kZXgpIDogbGlua1RleHQ7XG4gICAgY29uc3Qgc3VicGF0aCA9IGhhc2hJbmRleCA+PSAwID8gbGlua1RleHQuc2xpY2UoaGFzaEluZGV4KSA6IFwiXCI7XG4gICAgY29uc3QgZGVjb2RlZFBhdGggPSBkZWNvZGVVUklDb21wb25lbnQocmF3UGF0aC50cmltKCkpO1xuICAgIGlmIChkZWNvZGVkUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRGaWxlID0gdGhpcy5wbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZ2V0TGlua3BhdGgoZGVjb2RlZFBhdGgpLCBzb3VyY2VWYXVsdFJlbGF0aXZlUGF0aCk7XG4gICAgaWYgKCF0YXJnZXRGaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHsgdGFyZ2V0RmlsZSwgc3VicGF0aCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hcmtkb3duSHJlZihyYXdIcmVmOiBzdHJpbmcpOiBQYXJzZWRNYXJrZG93bkhyZWYgfCBudWxsIHtcbiAgICBjb25zdCB0cmltbWVkID0gcmF3SHJlZi50cmltKCk7XG4gICAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aChcIiNcIikgfHwgL15bYS16XSs6L2kudGVzdCh0cmltbWVkKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHdyYXBwZWRJbkFuZ2xlcyA9IHRyaW1tZWQuc3RhcnRzV2l0aChcIjxcIikgJiYgdHJpbW1lZC5lbmRzV2l0aChcIj5cIikgJiYgdHJpbW1lZC5sZW5ndGggPiAyO1xuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiB3cmFwcGVkSW5BbmdsZXMgPyB0cmltbWVkLnNsaWNlKDEsIC0xKSA6IHRyaW1tZWQsXG4gICAgICB3cmFwcGVkSW5BbmdsZXMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdG9XaWtpTGlua1BhdGgoY3VycmVudERlc3RpbmF0aW9uOiBzdHJpbmcsIHRhcmdldERlc3RpbmF0aW9uOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWxhdGl2ZUxpbmsgPSB0aGlzLnRvUmVsYXRpdmVMaW5rKGN1cnJlbnREZXN0aW5hdGlvbiwgdGFyZ2V0RGVzdGluYXRpb24pO1xuICAgIHJldHVybiBleHRlbnNpb24udG9Mb3dlckNhc2UoKSA9PT0gXCJtZFwiID8gcmVsYXRpdmVMaW5rLnJlcGxhY2UoL1xcLm1kJC9pLCBcIlwiKSA6IHJlbGF0aXZlTGluaztcbiAgfVxuXG4gIHByaXZhdGUgdG9SZWxhdGl2ZUxpbmsoZnJvbUZpbGU6IHN0cmluZywgdG9GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbGF0aXZlID0gbm9ybWFsaXplUGF0aChwYXRoLnBvc2l4LnJlbGF0aXZlKHBhdGgucG9zaXguZGlybmFtZShmcm9tRmlsZSksIHRvRmlsZSkpO1xuICAgIHJldHVybiByZWxhdGl2ZS5sZW5ndGggPiAwID8gcmVsYXRpdmUgOiBwYXRoLnBvc2l4LmJhc2VuYW1lKHRvRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIGVuY29kZU1hcmtkb3duTGlua1BhdGgobGlua1BhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVuY29kZVVSSShsaW5rUGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RGVzdGluYXRpb25UYWdzKGNvbnRlbnQ6IHN0cmluZywgbW9kZTogVHJhbnNmZXJNb2RlLCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gICAgY29uc3QgdGFncyA9IHRoaXMuZ2V0VGFnc0Zvck1vZGUobW9kZSk7XG4gICAgaWYgKHRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4geyBjb250ZW50IH07XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGNvbnRlbnQsIHRhZ3MpO1xuICAgIGlmIChyZXN1bHQud2FybmluZykge1xuICAgICAgcmV0dXJuIHsgY29udGVudCwgd2FybmluZzogYFNraXBwZWQgdGFnZ2luZyAke3NvdXJjZVBhdGh9OiAke3Jlc3VsdC53YXJuaW5nfWAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdGFnU291cmNlTWFya2Rvd24oZmlsZTogVEZpbGUsIHRhZ3M6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgaWYgKCFpc01hcmtkb3duRmlsZShmaWxlKSB8fCB0YWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRDb250ZW50ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hZGRUYWdzVG9NYXJrZG93bkNvbnRlbnQoY3VycmVudENvbnRlbnQsIHRhZ3MpO1xuICAgIGlmIChyZXN1bHQud2FybmluZykge1xuICAgICAgcmV0dXJuIGBTa2lwcGVkIHRhZ2dpbmcgc291cmNlIGZpbGUgJHtmaWxlLnBhdGh9OiAke3Jlc3VsdC53YXJuaW5nfWA7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuY29udGVudCAhPT0gY3VycmVudENvbnRlbnQpIHtcbiAgICAgIGNvbnN0IGZyb250bWF0dGVyUmFuZ2UgPSBjb2xsZWN0RnJvbnRtYXR0ZXJSYW5nZShjdXJyZW50Q29udGVudCk7XG4gICAgICBjb25zdCBmb3JtYXQgPSBmcm9udG1hdHRlclJhbmdlICYmIGZyb250bWF0dGVyUmFuZ2UgIT09IFwiaW52YWxpZFwiXG4gICAgICAgID8gZ2V0RXhpc3RpbmdUYWdGb3JtYXR0aW5nKGZyb250bWF0dGVyUmFuZ2UuYm9keSlcbiAgICAgICAgOiBcInVua25vd25cIjtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZnJvbnRtYXR0ZXI6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiB7XG4gICAgICAgICAgY29uc3QgbWVyZ2VkVGFncyA9IGpvaW5UYWdWYWx1ZXMoZXh0cmFjdEV4aXN0aW5nVGFncyhmcm9udG1hdHRlci50YWdzKSwgdGFncyk7XG4gICAgICAgICAgaWYgKG1lcmdlZFRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBkZWxldGUgZnJvbnRtYXR0ZXIudGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZm9ybWF0ID09PSBcImNvbW1hXCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZvcm1hdCA9PT0gXCJzcGFjZVwiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZnJvbnRtYXR0ZXIudGFncykgfHwgZm9ybWF0ID09PSBcImFycmF5XCIpIHtcbiAgICAgICAgICAgIGZyb250bWF0dGVyLnRhZ3MgPSBtZXJnZWRUYWdzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnRhZ3MgPT09IFwic3RyaW5nXCIgfHwgZm9ybWF0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBmcm9udG1hdHRlci50YWdzID0gbWVyZ2VkVGFncy5sZW5ndGggPT09IDEgPyBtZXJnZWRUYWdzWzBdIDogbWVyZ2VkVGFncztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZnJvbnRtYXR0ZXIudGFncyA9IG1lcmdlZFRhZ3MubGVuZ3RoID09PSAxID8gbWVyZ2VkVGFnc1swXSA6IG1lcmdlZFRhZ3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBgU2tpcHBlZCB0YWdnaW5nIHNvdXJjZSBmaWxlICR7ZmlsZS5wYXRofTogaW52YWxpZCBmcm9udG1hdHRlci5gO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVGFnc1RvTWFya2Rvd25Db250ZW50KGNvbnRlbnQ6IHN0cmluZywgdGFnczogc3RyaW5nW10pOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCB7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXJSYW5nZSA9IGNvbGxlY3RGcm9udG1hdHRlclJhbmdlKGNvbnRlbnQpO1xuICAgIGlmIChmcm9udG1hdHRlclJhbmdlID09PSBcImludmFsaWRcIikge1xuICAgICAgcmV0dXJuIHsgY29udGVudCwgd2FybmluZzogXCJpbnZhbGlkIGZyb250bWF0dGVyLlwiIH07XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbGRGcm9udG1hdHRlciA9IChmcm9udG1hdHRlckJvZHk6IHN0cmluZyB8IG51bGwpOiBGcm9udG1hdHRlclRhZ1Jlc3VsdCA9PiB7XG4gICAgICBjb25zdCBmb3JtYXQgPSBmcm9udG1hdHRlckJvZHkgPyBnZXRFeGlzdGluZ1RhZ0Zvcm1hdHRpbmcoZnJvbnRtYXR0ZXJCb2R5KSA6IFwidW5rbm93blwiO1xuICAgICAgbGV0IHBhcnNlZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcnNlZCA9IGZyb250bWF0dGVyQm9keSA/ICgocGFyc2VZYW1sKGZyb250bWF0dGVyQm9keSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID8/IHt9KSA6IHt9O1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQsIHdhcm5pbmc6IFwiaW52YWxpZCBmcm9udG1hdHRlci5cIiB9O1xuICAgICAgfVxuICAgICAgY29uc3QgbWVyZ2VkVGFncyA9IGpvaW5UYWdWYWx1ZXMoZXh0cmFjdEV4aXN0aW5nVGFncyhwYXJzZWQudGFncyksIHRhZ3MpO1xuICAgICAgaWYgKG1lcmdlZFRhZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGNvbnRlbnQgfTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZC50YWdzKSkge1xuICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3M7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJzZWQudGFncyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAoZm9ybWF0ID09PSBcImNvbW1hXCIpIHtcbiAgICAgICAgICBwYXJzZWQudGFncyA9IG1lcmdlZFRhZ3Muam9pbihcIiwgXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gXCJzcGFjZVwiKSB7XG4gICAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmpvaW4oXCIgXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnNlZC50YWdzID0gbWVyZ2VkVGFncy5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkLnRhZ3MgPSBtZXJnZWRUYWdzLmxlbmd0aCA9PT0gMSA/IG1lcmdlZFRhZ3NbMF0gOiBtZXJnZWRUYWdzO1xuICAgICAgfVxuICAgICAgY29uc3QgeWFtbEJvZHkgPSBzdHJpbmdpZnlZYW1sKHBhcnNlZCkudHJpbUVuZCgpO1xuICAgICAgY29uc3QgbmV4dEZyb250bWF0dGVyID0gYC0tLVxcbiR7eWFtbEJvZHl9XFxuLS0tXFxuYDtcbiAgICAgIGlmICghZnJvbnRtYXR0ZXJSYW5nZSkge1xuICAgICAgICByZXR1cm4geyBjb250ZW50OiBgJHtuZXh0RnJvbnRtYXR0ZXJ9JHtjb250ZW50fWAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IGAke25leHRGcm9udG1hdHRlcn0ke2NvbnRlbnQuc2xpY2UoZnJvbnRtYXR0ZXJSYW5nZS5yYW5nZVsxXSl9YCxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGlmICghZnJvbnRtYXR0ZXJSYW5nZSkge1xuICAgICAgcmV0dXJuIGJ1aWxkRnJvbnRtYXR0ZXIobnVsbCk7XG4gICAgfVxuICAgIHJldHVybiBidWlsZEZyb250bWF0dGVyKGZyb250bWF0dGVyUmFuZ2UuYm9keSk7XG4gIH1cblxuICBwcml2YXRlIGdldFRhZ3NGb3JNb2RlKG1vZGU6IFRyYW5zZmVyTW9kZSk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gY2xlYW5UYWdJbnB1dChtb2RlID09PSBcImNvcHlcIiA/IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JDb3BpZWRFbGVtZW50cyA6IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhZ3NGb3JNb3ZlZEVsZW1lbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGVsZXRlTW92ZWRTb3VyY2VzKHRyYW5zZmVycmVkRmlsZXM6IFRGaWxlW10sIHNlbGVjdGVkRm9sZGVyUGF0aHM6IHN0cmluZ1tdLCBzdW1tYXJ5OiBUcmFuc2ZlclN1bW1hcnkpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHVuaXF1ZUZpbGVzID0gWy4uLm5ldyBNYXAodHJhbnNmZXJyZWRGaWxlcy5tYXAoKGZpbGUpID0+IFtmaWxlLnBhdGgsIGZpbGVdKSkudmFsdWVzKCldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5wYXRoLmxlbmd0aCAtIGxlZnQucGF0aC5sZW5ndGgpO1xuICAgIGxldCBkZWxldGVkQ291bnQgPSAwO1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHVuaXF1ZUZpbGVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGZpbGUucGF0aCk7XG4gICAgICAgIGlmICghY3VycmVudEZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAuZmlsZU1hbmFnZXIudHJhc2hGaWxlKGN1cnJlbnRGaWxlKTtcbiAgICAgICAgZGVsZXRlZENvdW50ICs9IDE7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdW1tYXJ5LmZhaWxlZENvdW50ICs9IDE7XG4gICAgICAgIHN1bW1hcnkud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIGRlbGV0ZSBzb3VyY2UgZmlsZSAke2ZpbGUucGF0aH06ICR7dGhpcy50b0Vycm9yTWVzc2FnZShlcnJvciwgXCJDb3VsZCBub3QgZGVsZXRlIHNvdXJjZSBmaWxlLlwiKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzb3J0ZWRGb2xkZXJzID0gWy4uLnNlbGVjdGVkRm9sZGVyUGF0aHNdLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5sZW5ndGggLSBsZWZ0Lmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBmb2xkZXJQYXRoIG9mIHNvcnRlZEZvbGRlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGb2xkZXJCeVBhdGgoZm9sZGVyUGF0aCk7XG4gICAgICAgIGlmICghZm9sZGVyIHx8IGZvbGRlci5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnRyYXNoRmlsZShmb2xkZXIpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3VtbWFyeS53YXJuaW5ncy5wdXNoKGBGYWlsZWQgdG8gZGVsZXRlIHNvdXJjZSBmb2xkZXIgJHtmb2xkZXJQYXRofTogJHt0aGlzLnRvRXJyb3JNZXNzYWdlKGVycm9yLCBcIkNvdWxkIG5vdCBkZWxldGUgc291cmNlIGZvbGRlci5cIil9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGV0ZWRDb3VudDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcGF0aEV4aXN0cyhjYW5kaWRhdGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKGNhbmRpZGF0ZVBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kQXZhaWxhYmxlUGF0aChjYW5kaWRhdGVQYXRoOiBzdHJpbmcsIHJlc2VydmVkUGF0aHM6IFNldDxzdHJpbmc+LCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhdGgucGFyc2UoY2FuZGlkYXRlUGF0aCk7XG4gICAgbGV0IGluZGV4ID0gMTtcbiAgICBsZXQgbmV4dFBhdGggPSBjYW5kaWRhdGVQYXRoO1xuICAgIHdoaWxlIChyZXNlcnZlZFBhdGhzLmhhcyhuZXh0UGF0aCkgfHwgYXdhaXQgdGhpcy5wYXRoRXhpc3RzKG5leHRQYXRoKSB8fCBuZXh0UGF0aCA9PT0gc291cmNlUGF0aCkge1xuICAgICAgbmV4dFBhdGggPSBwYXRoLmpvaW4ocGFyc2VkLmRpciwgYCR7cGFyc2VkLm5hbWV9ICR7aW5kZXh9JHtwYXJzZWQuZXh0fWApO1xuICAgICAgaW5kZXggKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHRQYXRoO1xuICB9XG5cbiAgcHJpdmF0ZSB0b0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93biwgZmFsbGJhY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogZmFsbGJhY2s7XG4gIH1cbn1cblxuY2xhc3MgVGFyZ2V0VmF1bHRTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxEZXN0aW5hdGlvbkNvbmZpZz4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldHM6IERlc3RpbmF0aW9uQ29uZmlnW10sXG4gICAgcGxhY2Vob2xkZXI6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uQ2hvb3NlVGFyZ2V0OiAodGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZykgPT4gdm9pZCxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKHBsYWNlaG9sZGVyKTtcbiAgICB0aGlzLmVtcHR5U3RhdGVUZXh0ID0gXCJObyBkZXN0aW5hdGlvbiB2YXVsdHMgYXZhaWxhYmxlLlwiO1xuICB9XG5cbiAgZ2V0SXRlbXMoKTogRGVzdGluYXRpb25Db25maWdbXSB7XG4gICAgcmV0dXJuIHRoaXMudGFyZ2V0cztcbiAgfVxuXG4gIGdldEl0ZW1UZXh0KHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBzdHJpbmcge1xuICAgIHJldHVybiBnZXREZXN0aW5hdGlvbkRpc3BsYXlOYW1lKHRhcmdldCk7XG4gIH1cblxuICByZW5kZXJTdWdnZXN0aW9uKG1hdGNoOiBGdXp6eU1hdGNoPERlc3RpbmF0aW9uQ29uZmlnPiwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gbWF0Y2guaXRlbTtcbiAgICBlbC5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1zdWdnZXN0LXRpdGxlXCIsIHRleHQ6IGdldERlc3RpbmF0aW9uRGlzcGxheU5hbWUodGFyZ2V0KSB9KTtcbiAgICBjb25zdCBkZXRhaWwgPSBbdGFyZ2V0LnZhdWx0UGF0aC50cmltKCksIHRhcmdldC5kZXN0aW5hdGlvblBhdGgudHJpbSgpXS5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5sZW5ndGggPiAwKS5qb2luKFwiIC0+IFwiKTtcbiAgICBpZiAoZGV0YWlsLmxlbmd0aCA+IDApIHtcbiAgICAgIGVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXN1Z2dlc3QtZGV0YWlsXCIsIHRleHQ6IGRldGFpbCB9KTtcbiAgICB9XG4gIH1cblxuICBvbkNob29zZUl0ZW0odGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IHZvaWQge1xuICAgIHRoaXMub25DaG9vc2VUYXJnZXQodGFyZ2V0KTtcbiAgfVxufVxuXG5jbGFzcyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBzZWxlY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVFbGVtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW5wdXRFbGVtZW50PigpO1xuICBwcml2YXRlIHJlc29sdmVQcm9taXNlOiAoKHJlc3VsdDogUmV2aWV3TW9kYWxSZXN1bHQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSByb290czogUmV2aWV3Tm9kZVtdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29uZmxpY3RTdHJhdGVneTogQ29uZmxpY3RTdHJhdGVneSxcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICBmb3IgKGNvbnN0IHJvb3Qgb2Ygcm9vdHMpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU5vZGVTdGF0ZShyb290KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB3YWl0Rm9yUmVzdWx0KCk6IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8UmV2aWV3TW9kYWxSZXN1bHQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcInRyYW5zdmF1bHQtcmV2aWV3LW1vZGFsXCIpO1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiUmV2aWV3IGxpbmtlZCBub3Rlc1wiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IGNvbmZsaWN0Tm90aWNlID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LW5vdGljZVwiIH0pO1xuICAgIGNvbmZsaWN0Tm90aWNlLmNyZWF0ZVNwYW4oe1xuICAgICAgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LWJhZGdlXCIsXG4gICAgICB0ZXh0OiBgQ29uZmxpY3QgaGFuZGxpbmc6ICR7Z2V0Q29uZmxpY3RTdHJhdGVneUxhYmVsKHRoaXMuY29uZmxpY3RTdHJhdGVneSl9YCxcbiAgICB9KTtcbiAgICBjb25mbGljdE5vdGljZS5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWNvbmZsaWN0LXRleHRcIixcbiAgICAgIHRleHQ6IGdldENvbmZsaWN0U3RyYXRlZ3lEZXNjcmlwdGlvbih0aGlzLmNvbmZsaWN0U3RyYXRlZ3kpLFxuICAgIH0pO1xuICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlJldmlldyBkaXJlY3QgbGlua3MgYW5kIGJhY2tsaW5rcyBmb3IgdGhlIHNlbGVjdGVkIE1hcmtkb3duIG5vdGVzLiBUaGUgdHJhbnNmZXIgaW5jbHVkZXMgZXZlcnkgbm90ZSBpbnN0YW5jZSB0aGF0IHJlbWFpbnMgc2VsZWN0ZWQuXCIsXG4gICAgfSk7XG4gICAgY29uc3QgdHJlZSA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy10cmVlXCIgfSk7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVuZGVyTm9kZSh0cmVlLCByb290LCAwKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aW9ucyA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIgfSk7XG4gICAgY29uc3QgY2FuY2VsQnV0dG9uID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FuY2VsXCIgfSk7XG4gICAgY2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICB0aGlzLmZpbmlzaCh7IGNvbmZpcm1lZDogZmFsc2UsIHNlbGVjdGVkUGF0aHM6IFtdIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJUcmFuc2ZlciBzZWxlY3RlZCBpdGVtc1wiIH0pO1xuICAgIGNvbmZpcm1CdXR0b24uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgIGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIHRoaXMuZmluaXNoKHtcbiAgICAgICAgY29uZmlybWVkOiB0cnVlLFxuICAgICAgICBzZWxlY3RlZFBhdGhzOiBbLi4udGhpcy5nZXRTZWxlY3RlZFBhdGhzKCldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LmxvY2FsZUNvbXBhcmUocmlnaHQpKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yZXNvbHZlUHJvbWlzZSkge1xuICAgICAgdGhpcy5maW5pc2goeyBjb25maXJtZWQ6IGZhbHNlLCBzZWxlY3RlZFBhdGhzOiBbXSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGZpbmlzaChyZXN1bHQ6IFJldmlld01vZGFsUmVzdWx0KTogdm9pZCB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVzb2x2ZVByb21pc2U7XG4gICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IG51bGw7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHJlc29sdmU/LihyZXN1bHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplTm9kZVN0YXRlKG5vZGU6IFJldmlld05vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICB0aGlzLnNlbGVjdGlvblN0YXRlLnNldChub2RlLmlkLCB0cnVlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVOb2RlU3RhdGUoY2hpbGQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyTm9kZShjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIG5vZGU6IFJldmlld05vZGUsIGRlcHRoOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBpdGVtID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LW5vZGVcIiB9KTtcbiAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KFwiLS10cmFuc3ZhdWx0LWRlcHRoXCIsIFN0cmluZyhkZXB0aCkpO1xuICAgIGNvbnN0IHJvdyA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LXJvd1wiIH0pO1xuICAgIHJvdy5hZGRDbGFzcyhgdHJhbnN2YXVsdC1yZXZpZXctcm93LSR7bm9kZS50eXBlfWApO1xuICAgIGNvbnN0IGNoZWNrYm94U2hlbGwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LWNoZWNrYm94LXNoZWxsXCIgfSk7XG4gICAgY29uc3QgY2hlY2tib3ggPSBjaGVja2JveFNoZWxsLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcImNoZWNrYm94XCIgfSk7XG4gICAgdGhpcy5ub2RlRWxlbWVudHMuc2V0KG5vZGUuaWQsIGNoZWNrYm94KTtcbiAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlTm9kZShub2RlLCBjaGVja2JveC5jaGVja2VkKTtcbiAgICAgIHRoaXMucmVmcmVzaFRyZWUoKTtcbiAgICB9KTtcbiAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveFNoZWxsLmNyZWF0ZVNwYW4oeyBjbHM6IFwidHJhbnN2YXVsdC1jaGVjay1pbmRpY2F0b3JcIiB9KTtcbiAgICBjb25zdCBpY29uRWwgPSByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy1pY29uXCIgfSk7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICBpZiAobm9kZS5kaXJlY3Rpb24pIHtcbiAgICAgICAgc2V0SWNvbihpY29uRWwsIG5vZGUuZGlyZWN0aW9uID09PSBcInRvXCIgPyBcImxpbmtzLWdvaW5nLW91dFwiIDogXCJsaW5rcy1jb21pbmctaW5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSB7XG4gICAgICBzZXRJY29uKGljb25FbCwgXCJwYXBlcmNsaXBcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldEljb24oaWNvbkVsLCBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgPyBcImZpbGUtdGV4dFwiIDogXCJmaWxlXCIpO1xuICAgIH1cbiAgICBjb25zdCBsYWJlbCA9IHJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInRyYW5zdmF1bHQtcmV2aWV3LWxhYmVsXCIsIHRleHQ6IG5vZGUubGFiZWwgfSk7XG4gICAgbGFiZWwuYWRkQ2xhc3MoYHRyYW5zdmF1bHQtcmV2aWV3LWxhYmVsLSR7bm9kZS50eXBlfWApO1xuXG4gICAgY29uc3QgY2hpbGRyZW5Db250YWluZXIgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXJldmlldy1jaGlsZHJlblwiIH0pO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKGNoaWxkcmVuQ29udGFpbmVyLCBjaGlsZCwgZGVwdGggKyAxKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDaGVja2JveChub2RlLCBjaGVja2JveCwgaW5kaWNhdG9yKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFRyZWUoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb290IG9mIHRoaXMucm9vdHMpIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUocm9vdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoTm9kZShub2RlOiBSZXZpZXdOb2RlKTogdm9pZCB7XG4gICAgY29uc3QgY2hlY2tib3ggPSB0aGlzLm5vZGVFbGVtZW50cy5nZXQobm9kZS5pZCk7XG4gICAgaWYgKGNoZWNrYm94KSB7XG4gICAgICBjb25zdCBpbmRpY2F0b3IgPSBjaGVja2JveC5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi50cmFuc3ZhdWx0LWNoZWNrLWluZGljYXRvclwiKSA/PyBudWxsO1xuICAgICAgaWYgKGluZGljYXRvcikge1xuICAgICAgICB0aGlzLnVwZGF0ZUNoZWNrYm94KG5vZGUsIGNoZWNrYm94LCBpbmRpY2F0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMucmVmcmVzaE5vZGUoY2hpbGQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQ2hlY2tib3gobm9kZTogUmV2aWV3Tm9kZSwgY2hlY2tib3g6IEhUTUxJbnB1dEVsZW1lbnQsIGluZGljYXRvcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuZ2V0Tm9kZVN0YXR1cyhub2RlKTtcbiAgICBjaGVja2JveC5jaGVja2VkID0gc3RhdGUgPT09IFwiY2hlY2tlZFwiO1xuICAgIGNoZWNrYm94LmluZGV0ZXJtaW5hdGUgPSBzdGF0ZSA9PT0gXCJtaXhlZFwiO1xuICAgIGluZGljYXRvci50ZXh0Q29udGVudCA9IHN0YXRlID09PSBcIm1peGVkXCIgPyBcIi1cIiA6IFwiXCI7XG4gICAgaW5kaWNhdG9yLnRvZ2dsZUNsYXNzKFwiaXMtdmlzaWJsZVwiLCBzdGF0ZSA9PT0gXCJtaXhlZFwiKTtcbiAgICBjaGVja2JveC5kYXRhc2V0LnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICBwcml2YXRlIGdldE5vZGVTdGF0dXMobm9kZTogUmV2aWV3Tm9kZSk6IFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIiB7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21iaW5lU3RhdHVzZXMobm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkKSA9PiB0aGlzLmdldE5vZGVTdGF0dXMoY2hpbGQpKSk7XG4gICAgfVxuICAgIGNvbnN0IHNlbGZTZWxlY3RlZCA9IHRoaXMuc2VsZWN0aW9uU3RhdGUuZ2V0KG5vZGUuaWQpID8/IGZhbHNlO1xuICAgIGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNlbGZTZWxlY3RlZCA/IFwiY2hlY2tlZFwiIDogXCJ1bmNoZWNrZWRcIjtcbiAgICB9XG4gICAgY29uc3QgY2hpbGRTdGF0dXMgPSB0aGlzLmNvbWJpbmVTdGF0dXNlcyhub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQpID0+IHRoaXMuZ2V0Tm9kZVN0YXR1cyhjaGlsZCkpKTtcbiAgICBpZiAoc2VsZlNlbGVjdGVkICYmIGNoaWxkU3RhdHVzID09PSBcImNoZWNrZWRcIikge1xuICAgICAgcmV0dXJuIFwiY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoIXNlbGZTZWxlY3RlZCAmJiBjaGlsZFN0YXR1cyA9PT0gXCJ1bmNoZWNrZWRcIikge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIHJldHVybiBcIm1peGVkXCI7XG4gIH1cblxuICBwcml2YXRlIGNvbWJpbmVTdGF0dXNlcyhzdGF0dXNlczogQXJyYXk8XCJjaGVja2VkXCIgfCBcInVuY2hlY2tlZFwiIHwgXCJtaXhlZFwiPik6IFwiY2hlY2tlZFwiIHwgXCJ1bmNoZWNrZWRcIiB8IFwibWl4ZWRcIiB7XG4gICAgaWYgKHN0YXR1c2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIGlmIChzdGF0dXNlcy5ldmVyeSgoc3RhdHVzKSA9PiBzdGF0dXMgPT09IFwiY2hlY2tlZFwiKSkge1xuICAgICAgcmV0dXJuIFwiY2hlY2tlZFwiO1xuICAgIH1cbiAgICBpZiAoc3RhdHVzZXMuZXZlcnkoKHN0YXR1cykgPT4gc3RhdHVzID09PSBcInVuY2hlY2tlZFwiKSkge1xuICAgICAgcmV0dXJuIFwidW5jaGVja2VkXCI7XG4gICAgfVxuICAgIHJldHVybiBcIm1peGVkXCI7XG4gIH1cblxuICBwcml2YXRlIHRvZ2dsZU5vZGUobm9kZTogUmV2aWV3Tm9kZSwgY2hlY2tlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmIChub2RlLnR5cGUgPT09IFwibm90ZVwiIHx8IG5vZGUudHlwZSA9PT0gXCJhdHRhY2htZW50XCIpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uU3RhdGUuc2V0KG5vZGUuaWQsIGNoZWNrZWQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMudG9nZ2xlTm9kZShjaGlsZCwgY2hlY2tlZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTZWxlY3RlZFBhdGhzKCk6IFNldDxzdHJpbmc+IHtcbiAgICBjb25zdCBzZWxlY3RlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgcm9vdCBvZiB0aGlzLnJvb3RzKSB7XG4gICAgICB0aGlzLmNvbGxlY3RTZWxlY3RlZFBhdGhzKHJvb3QsIHNlbGVjdGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGVjdGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0U2VsZWN0ZWRQYXRocyhub2RlOiBSZXZpZXdOb2RlLCBzaW5rOiBTZXQ8c3RyaW5nPik6IHZvaWQge1xuICAgIGlmICgobm9kZS50eXBlID09PSBcIm5vdGVcIiB8fCBub2RlLnR5cGUgPT09IFwiYXR0YWNobWVudFwiKSAmJiBub2RlLmZpbGVQYXRoICYmICh0aGlzLnNlbGVjdGlvblN0YXRlLmdldChub2RlLmlkKSA/PyBmYWxzZSkpIHtcbiAgICAgIHNpbmsuYWRkKG5vZGUuZmlsZVBhdGgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIHRoaXMuY29sbGVjdFNlbGVjdGVkUGF0aHMoY2hpbGQsIHNpbmspO1xuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgaW5zdGFsbGVkIDEuMTIgdHlwZSBkZWZpbml0aW9ucyBzdGlsbCByZXF1aXJlIHRoZSBsZWdhY3kgc2V0dGluZ3MgcmVuZGVyZXIuXG4vLyBAdHMtZXhwZWN0LWVycm9yIE9ic2lkaWFuIDEuMTMgZGVjbGFyYXRpdmUgc2V0dGluZ3MgdGFicyBkbyBub3QgcmVxdWlyZSB0aGUgbGVnYWN5IHJlbmRlcmVyLlxuY2xhc3MgVHJhbnNWYXVsdFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBUcmFuc1ZhdWx0UGx1Z2luLCBwcml2YXRlIHJlYWRvbmx5IGRlc3RpbmF0aW9uUmVzb2x2ZXI6IERlc3RpbmF0aW9uUmVzb2x2ZXIpIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gIH1cblxuICByZW5kZXJMZWdhY3lTZXR0aW5ncyA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiUmVsZWFzZSBub3Rlc1wiKVxuICAgICAgLnNldERlc2MoXCJSZWFkIHdoYXQgY2hhbmdlZCBpbiB0aGlzIHZlcnNpb24uXCIpXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTaG93IHJlbGVhc2Ugbm90ZXNcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgbmV3IFJlbGVhc2VOb3Rlc01vZGFsKHRoaXMuYXBwKS5vcGVuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImJyXCIpO1xuXG4gICAgdGhpcy5hZGREcm9wZG93blNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiQ29uZmxpY3QgaGFuZGxpbmdcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGV0aGVyIGV4aXN0aW5nIGRlc3RpbmF0aW9uIGZpbGVzIGFyZSBza2lwcGVkLCByZW5hbWVkIGF1dG9tYXRpY2FsbHksIG9yIG92ZXJ3cml0dGVuLlwiLFxuICAgICAgb3B0aW9uczogKE9iamVjdC5lbnRyaWVzKENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBKSBhcyBBcnJheTxbQ29uZmxpY3RTdHJhdGVneSwgdHlwZW9mIENPTkZMSUNUX1NUUkFURUdZX01FVEFEQVRBW0NvbmZsaWN0U3RyYXRlZ3ldXT4pXG4gICAgICAgIC5tYXAoKFt2YWx1ZSwgbWV0YV0pID0+ICh7IHZhbHVlLCBsYWJlbDogbWV0YS5sYWJlbCB9KSksXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29uZmxpY3RTdHJhdGVneSA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRvZ2dsZVNldHRpbmcoY29udGFpbmVyRWwsIHtcbiAgICAgIG5hbWU6IFwiSW5jbHVkZSBsaW5rZWQgZmlsZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgZGlyZWN0bHkgcmVsYXRlZCBub3RlcyBhbmQgbGlua2VkIG5vbi1NYXJrZG93biBmaWxlcyBmcm9tIHNlbGVjdGVkIG5vdGVzLlwiLFxuICAgICAgdmFsdWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLmluY2x1ZGVMaW5rZWRGaWxlcyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5jbHVkZUxpbmtlZEZpbGVzID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkRHJvcGRvd25TZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlJldmlldyBkaWFsb2dcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGVuIHRvIHNob3cgdGhlIHRyYW5zZmVyIHJldmlldyBkaWFsb2cuXCIsXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHsgdmFsdWU6IFwiYWx3YXlzXCIsIGxhYmVsOiBcIkFsd2F5c1wiIH0sXG4gICAgICAgIHsgdmFsdWU6IFwibGlua2VkLW9ubHlcIiwgbGFiZWw6IFwiT25seSB3aGVuIG5vdGVzIGFyZSBsaW5rZWRcIiB9LFxuICAgICAgICB7IHZhbHVlOiBcIm5ldmVyXCIsIGxhYmVsOiBcIk5ldmVyXCIgfSxcbiAgICAgIF0sXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIlRhZ3MgZm9yIGNvcGllZCBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBjb3B5aW5nLlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IFwiY29waWVkLCBzZW50XCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0ZvckNvcGllZEVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yQ29waWVkRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUb2dnbGVTZXR0aW5nKGNvbnRhaW5lckVsLCB7XG4gICAgICBuYW1lOiBcIkFsc28gdGFnIGNvcGllZCBzb3VyY2Ugbm90ZXNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIldyaXRlIHRoZSBjb25maWd1cmVkIGNvcHkgdGFncyBiYWNrIGludG8gc291cmNlIE1hcmtkb3duIGZpbGVzIGluIHRoZSBhY3RpdmUgdmF1bHQuXCIsXG4gICAgICB2YWx1ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxzb1RhZ0NvcGllZFNvdXJjZUVsZW1lbnRzLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjb250YWluZXJFbCwge1xuICAgICAgbmFtZTogXCJUYWdzIGZvciBtb3ZlZCBub3Rlc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBtb3ZpbmcuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogXCJtb3ZlZCwgYXJjaGl2ZWRcIixcbiAgICAgIHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YWdzRm9yTW92ZWRFbGVtZW50cyxcbiAgICAgIG9uQ2hhbmdlOiBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFnc0Zvck1vdmVkRWxlbWVudHMgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXJEZXN0aW5hdGlvblNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgfVxuXG4gIGdldFNldHRpbmdEZWZpbml0aW9ucygpIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBuYW1lOiBcIlJlbGVhc2Ugbm90ZXNcIixcbiAgICAgICAgZGVzYzogXCJSZWFkIHdoYXQgY2hhbmdlZCBpbiB0aGlzIHZlcnNpb24uXCIsXG4gICAgICAgIGFjdGlvbjogKCkgPT4gbmV3IFJlbGVhc2VOb3Rlc01vZGFsKHRoaXMuYXBwKS5vcGVuKCksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkNvbmZsaWN0IGhhbmRsaW5nXCIsXG4gICAgICAgIGRlc2M6IFwiQ2hvb3NlIHdoZXRoZXIgZXhpc3RpbmcgZGVzdGluYXRpb24gZmlsZXMgYXJlIHNraXBwZWQsIHJlbmFtZWQgYXV0b21hdGljYWxseSwgb3Igb3ZlcndyaXR0ZW4uXCIsXG4gICAgICAgIGNvbnRyb2w6IHtcbiAgICAgICAgICB0eXBlOiBcImRyb3Bkb3duXCIsXG4gICAgICAgICAga2V5OiBcImNvbmZsaWN0U3RyYXRlZ3lcIixcbiAgICAgICAgICBvcHRpb25zOiBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgICAgICAoT2JqZWN0LmVudHJpZXMoQ09ORkxJQ1RfU1RSQVRFR1lfTUVUQURBVEEpIGFzIEFycmF5PFtDb25mbGljdFN0cmF0ZWd5LCB0eXBlb2YgQ09ORkxJQ1RfU1RSQVRFR1lfTUVUQURBVEFbQ29uZmxpY3RTdHJhdGVneV1dPilcbiAgICAgICAgICAgICAgLm1hcCgoW3ZhbHVlLCBtZXRhXSkgPT4gW3ZhbHVlLCBtZXRhLmxhYmVsXSksXG4gICAgICAgICAgKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiSW5jbHVkZSBsaW5rZWQgZmlsZXNcIixcbiAgICAgICAgZGVzYzogXCJJbmNsdWRlIGRpcmVjdGx5IHJlbGF0ZWQgbm90ZXMgYW5kIGxpbmtlZCBub24tTWFya2Rvd24gZmlsZXMgZnJvbSBzZWxlY3RlZCBub3Rlcy5cIixcbiAgICAgICAgY29udHJvbDogeyB0eXBlOiBcInRvZ2dsZVwiLCBrZXk6IFwiaW5jbHVkZUxpbmtlZEZpbGVzXCIgfSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiUmV2aWV3IGRpYWxvZ1wiLFxuICAgICAgICBkZXNjOiBcIkNob29zZSB3aGVuIHRvIHNob3cgdGhlIHRyYW5zZmVyIHJldmlldyBkaWFsb2cuXCIsXG4gICAgICAgIGNvbnRyb2w6IHtcbiAgICAgICAgICB0eXBlOiBcImRyb3Bkb3duXCIsXG4gICAgICAgICAga2V5OiBcInJldmlld0RpYWxvZ01vZGVcIixcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBhbHdheXM6IFwiQWx3YXlzXCIsXG4gICAgICAgICAgICBcImxpbmtlZC1vbmx5XCI6IFwiT25seSB3aGVuIG5vdGVzIGFyZSBsaW5rZWRcIixcbiAgICAgICAgICAgIG5ldmVyOiBcIk5ldmVyXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiVGFncyBmb3IgY29waWVkIG5vdGVzXCIsXG4gICAgICAgIGRlc2M6IFwiQ29tbWEtc2VwYXJhdGVkIHRhZ3MgYWRkZWQgdG8gdHJhbnNmZXJyZWQgTWFya2Rvd24gZmlsZXMgd2hlbiBjb3B5aW5nLlwiLFxuICAgICAgICBjb250cm9sOiB7IHR5cGU6IFwidGV4dFwiLCBrZXk6IFwidGFnc0ZvckNvcGllZEVsZW1lbnRzXCIsIHBsYWNlaG9sZGVyOiBcImNvcGllZCwgc2VudFwiIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkFsc28gdGFnIGNvcGllZCBzb3VyY2Ugbm90ZXNcIixcbiAgICAgICAgZGVzYzogXCJXcml0ZSB0aGUgY29uZmlndXJlZCBjb3B5IHRhZ3MgYmFjayBpbnRvIHNvdXJjZSBNYXJrZG93biBmaWxlcyBpbiB0aGUgYWN0aXZlIHZhdWx0LlwiLFxuICAgICAgICBjb250cm9sOiB7IHR5cGU6IFwidG9nZ2xlXCIsIGtleTogXCJhbHNvVGFnQ29waWVkU291cmNlRWxlbWVudHNcIiB9LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJUYWdzIGZvciBtb3ZlZCBub3Rlc1wiLFxuICAgICAgICBkZXNjOiBcIkNvbW1hLXNlcGFyYXRlZCB0YWdzIGFkZGVkIHRvIHRyYW5zZmVycmVkIE1hcmtkb3duIGZpbGVzIHdoZW4gbW92aW5nLlwiLFxuICAgICAgICBjb250cm9sOiB7IHR5cGU6IFwidGV4dFwiLCBrZXk6IFwidGFnc0Zvck1vdmVkRWxlbWVudHNcIiwgcGxhY2Vob2xkZXI6IFwibW92ZWQsIGFyY2hpdmVkXCIgfSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRGVzdGluYXRpb24gdmF1bHRzXCIsXG4gICAgICAgIGRlc2M6IFwiQ29uZmlndXJlIGxvY2FsIGRlc3RpbmF0aW9uIHZhdWx0cyBmb3IgY29waWVkIGFuZCBtb3ZlZCBjb250ZW50LlwiLFxuICAgICAgICByZW5kZXI6IChzZXR0aW5nOiBTZXR0aW5nKSA9PiB7XG4gICAgICAgICAgc2V0dGluZy5zZXR0aW5nRWwuZW1wdHkoKTtcbiAgICAgICAgICBzZXR0aW5nLnNldHRpbmdFbC5hZGRDbGFzcyhcInRyYW5zdmF1bHQtZGVzdGluYXRpb24tc2V0dGluZ3NcIik7XG4gICAgICAgICAgdGhpcy5yZW5kZXJEZXN0aW5hdGlvblNldHRpbmdzKHNldHRpbmcuc2V0dGluZ0VsKTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRGVzdGluYXRpb25TZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIkRlc3RpbmF0aW9uIHZhdWx0c1wiKS5zZXRIZWFkaW5nKCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiVXNlIGFic29sdXRlIHBhdGhzLiBEZXN0aW5hdGlvbiBhbmQgYXR0YWNobWVudCBwYXRocyBtdXN0IHN0YXkgaW5zaWRlIHRoZSBkZXN0aW5hdGlvbiB2YXVsdCByb290LlwiLFxuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cykge1xuICAgICAgdGhpcy5yZW5kZXJEZXN0aW5hdGlvbkNhcmQoY29udGFpbmVyRWwsIHRhcmdldCk7XG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFkZCBkZXN0aW5hdGlvblwiKVxuICAgICAgLnNldERlc2MoXCJDcmVhdGUgYW5vdGhlciBkZXN0aW5hdGlvbiB2YXVsdCBjb25maWd1cmF0aW9uLlwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQWRkIGRlc3RpbmF0aW9uXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMucHVzaChjcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCkpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICh0aGlzIGFzIHVua25vd24gYXMgeyB1cGRhdGU6ICgpID0+IHZvaWQgfSkudXBkYXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckRlc3RpbmF0aW9uQ2FyZChjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtdGFyZ2V0LWNhcmRcIiB9KTtcbiAgICBjb25zdCB2YWxpZGF0aW9uSG9zdCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtdGFyZ2V0LXZhbGlkYXRpb25cIiB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY2FyZCwge1xuICAgICAgbmFtZTogXCJEZXN0aW5hdGlvbiBuYW1lXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJMYWJlbCBzaG93biBpbiBkZXN0aW5hdGlvbiBzZWxlY3Rpb24gbWVudXMuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogZ2V0RGVzdGluYXRpb25EaXNwbGF5TmFtZSh0YXJnZXQpLFxuICAgICAgdmFsdWU6IHRhcmdldC5uYW1lLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0YXJnZXQubmFtZSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlQW5kUmVmcmVzaFZhbGlkYXRpb24odmFsaWRhdGlvbkhvc3QsIHRhcmdldCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRUZXh0U2V0dGluZyhjYXJkLCB7XG4gICAgICBuYW1lOiBcIkRlc3RpbmF0aW9uIHZhdWx0IHBhdGhcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFic29sdXRlIHBhdGggdG8gdGhlIHJvb3Qgb2YgdGhlIGRlc3RpbmF0aW9uIHZhdWx0LlwiLFxuICAgICAgcGxhY2Vob2xkZXI6IHRoaXMuZXhhbXBsZVBhdGgoXCJWYXVsdFwiKSxcbiAgICAgIHZhbHVlOiB0YXJnZXQudmF1bHRQYXRoLFxuICAgICAgb25DaGFuZ2U6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0YXJnZXQudmF1bHRQYXRoID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBpZiAodGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24pIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZURldGVjdGVkQXR0YWNobWVudFBhdGgodGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbih2YWxpZGF0aW9uSG9zdCwgdGFyZ2V0KTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgIG5hbWU6IFwiRGVzdGluYXRpb24gcGF0aFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0IHdoZXJlIGNvcGllZCBhbmQgbW92ZWQgY29udGVudCB3aWxsIGxhbmQuXCIsXG4gICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0L0luYm94XCIpLFxuICAgICAgdmFsdWU6IHRhcmdldC5kZXN0aW5hdGlvblBhdGgsXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC5kZXN0aW5hdGlvblBhdGggPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVG9nZ2xlU2V0dGluZyhjYXJkLCB7XG4gICAgICBuYW1lOiBcIlVzZSBkZWZhdWx0IGF0dGFjaG1lbnQgbG9jYXRpb25cIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlJlYWQgdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGNvbmZpZ3VyYXRpb24gYW5kIHJlc29sdmUgdGhlIGF0dGFjaG1lbnQgZm9sZGVyIGF1dG9tYXRpY2FsbHkuXCIsXG4gICAgICB2YWx1ZTogdGFyZ2V0LnVzZURlZmF1bHRBdHRhY2htZW50TG9jYXRpb24sXG4gICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uID0gdmFsdWU7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRGV0ZWN0ZWRBdHRhY2htZW50UGF0aCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2goKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoIXRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uKSB7XG4gICAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNhcmQsIHtcbiAgICAgICAgbmFtZTogXCJBdHRhY2htZW50IHBhdGhcIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiQWJzb2x1dGUgcGF0aCBpbnNpZGUgdGhlIGRlc3RpbmF0aW9uIHZhdWx0IGZvciBsaW5rZWQgbm9uLU1hcmtkb3duIGZpbGVzLlwiLFxuICAgICAgICBwbGFjZWhvbGRlcjogdGhpcy5leGFtcGxlUGF0aChcIlZhdWx0L0F0dGFjaG1lbnRzXCIpLFxuICAgICAgICB2YWx1ZTogdGFyZ2V0LmF0dGFjaG1lbnRQYXRoLFxuICAgICAgICBvbkNoYW5nZTogYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2hWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uKHZhbGlkYXRpb25Ib3N0LCB0YXJnZXQpO1xuXG4gICAgbmV3IFNldHRpbmcoY2FyZCkuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlXCIpLnNldFdhcm5pbmcoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFyZ2V0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKChlbnRyeSkgPT4gZW50cnkuaWQgIT09IHRhcmdldC5pZCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFuZFJlZnJlc2goKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRUZXh0U2V0dGluZyhcbiAgICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgICAgcGxhY2Vob2xkZXI6IHN0cmluZztcbiAgICAgIHZhbHVlOiBzdHJpbmc7XG4gICAgICBvbkNoYW5nZTogKHZhbHVlOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XG4gICAgfSxcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShjb25maWcubmFtZSlcbiAgICAgIC5zZXREZXNjKGNvbmZpZy5kZXNjcmlwdGlvbilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoY29uZmlnLnBsYWNlaG9sZGVyKS5zZXRWYWx1ZShjb25maWcudmFsdWUpLm9uQ2hhbmdlKGNvbmZpZy5vbkNoYW5nZSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVG9nZ2xlU2V0dGluZyhcbiAgICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgICAgdmFsdWU6IGJvb2xlYW47XG4gICAgICBvbkNoYW5nZTogKHZhbHVlOiBib29sZWFuKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIH0sXG4gICk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoY29uZmlnLm5hbWUpXG4gICAgICAuc2V0RGVzYyhjb25maWcuZGVzY3JpcHRpb24pXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKGNvbmZpZy52YWx1ZSkub25DaGFuZ2UoY29uZmlnLm9uQ2hhbmdlKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGREcm9wZG93blNldHRpbmc8VCBleHRlbmRzIHN0cmluZz4oXG4gICAgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxuICAgIGNvbmZpZzoge1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICAgIG9wdGlvbnM6IEFycmF5PHsgdmFsdWU6IFQ7IGxhYmVsOiBzdHJpbmcgfT47XG4gICAgICB2YWx1ZTogVDtcbiAgICAgIG9uQ2hhbmdlOiAodmFsdWU6IFQpID0+IFByb21pc2U8dm9pZD47XG4gICAgfSxcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShjb25maWcubmFtZSlcbiAgICAgIC5zZXREZXNjKGNvbmZpZy5kZXNjcmlwdGlvbilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgY29uZmlnLm9wdGlvbnMpIHtcbiAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24ob3B0aW9uLnZhbHVlLCBvcHRpb24ubGFiZWwpO1xuICAgICAgICB9XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy52YWx1ZSkub25DaGFuZ2UoKHZhbHVlKSA9PiBjb25maWcub25DaGFuZ2UodmFsdWUgYXMgVCkpO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVBbmRSZWZyZXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICh0aGlzIGFzIHVua25vd24gYXMgeyB1cGRhdGU6ICgpID0+IHZvaWQgfSkudXBkYXRlKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVBbmRSZWZyZXNoVmFsaWRhdGlvbihjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb24oY29udGFpbmVyRWwsIHRhcmdldCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclZhbGlkYXRpb24oY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCB0YXJnZXQ6IERlc3RpbmF0aW9uQ29uZmlnKTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb25zdCBlcnJvcnMgPSB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIudmFsaWRhdGUodGFyZ2V0KTtcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uICYmIHRhcmdldC5hdHRhY2htZW50UGF0aC50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogYERldGVjdGVkIGF0dGFjaG1lbnQgcGF0aDogJHt0YXJnZXQuYXR0YWNobWVudFBhdGgudHJpbSgpfWAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXJyb3Igb2YgZXJyb3JzKSB7XG4gICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogZXJyb3IgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVEZXRlY3RlZEF0dGFjaG1lbnRQYXRoKHRhcmdldDogRGVzdGluYXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBub3JtYWxpemVkVmF1bHRQYXRoID0gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh0YXJnZXQudmF1bHRQYXRoKTtcbiAgICBpZiAoIXBhdGguaXNBYnNvbHV0ZShub3JtYWxpemVkVmF1bHRQYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0YXJnZXQuYXR0YWNobWVudFBhdGggPSBhd2FpdCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIucmVzb2x2ZURlZmF1bHRBdHRhY2htZW50UGF0aChub3JtYWxpemVkVmF1bHRQYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhhbXBsZVBhdGgoc3VmZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIgPyBgQzpcXFxcJHtzdWZmaXgucmVwbGFjZSgvXFwvL2csIFwiXFxcXFwiKX1gIDogYC9Vc2Vycy9leGFtcGxlLyR7c3VmZml4LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpfWA7XG4gIH1cbn1cblxuY2xhc3MgUmVsZWFzZU5vdGVzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXIgPSBuZXcgQ29tcG9uZW50KCk7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiUmVsZWFzZSBub3Rlc1wiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIHZvaWQgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIHJlbGVhc2VOb3RlcywgdGhpcy5jb250ZW50RWwsIFwiUkVMRUFTRU5PVEVTLm1kXCIsIHRoaXMucmVuZGVyZXIpO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnJlbmRlcmVyLnVubG9hZCgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhbnNWYXVsdFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBUcmFuc1ZhdWx0U2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlYWRvbmx5IGRlc3RpbmF0aW9uUmVzb2x2ZXIgPSBuZXcgRGVzdGluYXRpb25SZXNvbHZlcih0aGlzLmFwcC52YXVsdC5jb25maWdEaXIpO1xuICBwcml2YXRlIHBsYW5uZXIgPSBuZXcgVHJhbnNmZXJQbGFubmVyKHRoaXMsIHRoaXMuZGVzdGluYXRpb25SZXNvbHZlcik7XG4gIHByaXZhdGUgZXhlY3V0b3IgPSBuZXcgVHJhbnNmZXJFeGVjdXRvcih0aGlzKTtcbiAgcHJpdmF0ZSBub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IGZhbHNlO1xuICBwcml2YXRlIG5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCFQbGF0Zm9ybS5pc0Rlc2t0b3BBcHApIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJUcmFucyBWYXVsdCBpcyBhdmFpbGFibGUgb25seSBvbiBkZXNrdG9wLlwiLCAxMDAwMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFRyYW5zVmF1bHRTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzLCB0aGlzLmRlc3RpbmF0aW9uUmVzb2x2ZXIpKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tbWFuZHMoKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29udGV4dE1lbnVzKCk7XG4gICAgdGhpcy5yZWdpc3Rlck5vdGVib29rTmF2aWdhdG9ySW50ZWdyYXRpb24oKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzdG9yZWQgPSAoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSBhcyAoUGFydGlhbDxUcmFuc1ZhdWx0U2V0dGluZ3M+ICYgeyBzaG93UmV2aWV3RGlhbG9nPzogYm9vbGVhbiB9KSB8IG51bGw7XG4gICAgY29uc3QgbWlncmF0ZWRSZXZpZXdEaWFsb2dNb2RlOiBSZXZpZXdEaWFsb2dNb2RlIHwgdW5kZWZpbmVkID0gc3RvcmVkPy5yZXZpZXdEaWFsb2dNb2RlXG4gICAgICA/PyAodHlwZW9mIHN0b3JlZD8uc2hvd1Jldmlld0RpYWxvZyA9PT0gXCJib29sZWFuXCJcbiAgICAgICAgPyAoc3RvcmVkLnNob3dSZXZpZXdEaWFsb2cgPyBcImxpbmtlZC1vbmx5XCIgOiBcIm5ldmVyXCIpXG4gICAgICAgIDogdW5kZWZpbmVkKTtcbiAgICB0aGlzLnNldHRpbmdzID0ge1xuICAgICAgLi4uREVGQVVMVF9TRVRUSU5HUyxcbiAgICAgIC4uLnN0b3JlZCxcbiAgICAgIHJldmlld0RpYWxvZ01vZGU6IG1pZ3JhdGVkUmV2aWV3RGlhbG9nTW9kZSA/PyBERUZBVUxUX1NFVFRJTkdTLnJldmlld0RpYWxvZ01vZGUsXG4gICAgICB0YXJnZXRzOiAoc3RvcmVkPy50YXJnZXRzID8/IFtdKS5tYXAoKHRhcmdldCkgPT4ge1xuICAgICAgICBjb25zdCBtaWdyYXRlZFRhcmdldCA9IHtcbiAgICAgICAgICAuLi5jcmVhdGVCbGFua0Rlc3RpbmF0aW9uKCksXG4gICAgICAgICAgLi4udGFyZ2V0LFxuICAgICAgICAgIGlkOiB0YXJnZXQuaWQgPz8gY3JlYXRlRGVzdGluYXRpb25JZCgpLFxuICAgICAgICB9O1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uICE9PSBcImJvb2xlYW5cIiAmJiAhdGFyZ2V0LmF0dGFjaG1lbnRQYXRoPy50cmltKCkpIHtcbiAgICAgICAgICBtaWdyYXRlZFRhcmdldC51c2VEZWZhdWx0QXR0YWNobWVudExvY2F0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWlncmF0ZWRUYXJnZXQ7XG4gICAgICB9KSxcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgdGhpcy5zZXR0aW5ncy50YXJnZXRzKSB7XG4gICAgICBjb25zdCBub3JtYWxpemVkVmF1bHRQYXRoID0gbm9ybWFsaXplQ29uZmlndXJlZFBhdGhJbnB1dCh0YXJnZXQudmF1bHRQYXRoKTtcbiAgICAgIGlmICh0YXJnZXQudXNlRGVmYXVsdEF0dGFjaG1lbnRMb2NhdGlvbiAmJiBwYXRoLmlzQWJzb2x1dGUobm9ybWFsaXplZFZhdWx0UGF0aCkpIHtcbiAgICAgICAgdGFyZ2V0LmF0dGFjaG1lbnRQYXRoID0gYXdhaXQgdGhpcy5kZXN0aW5hdGlvblJlc29sdmVyLnJlc29sdmVEZWZhdWx0QXR0YWNobWVudFBhdGgobm9ybWFsaXplZFZhdWx0UGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyQ29tbWFuZHMoKTogdm9pZCB7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktYWN0aXZlLWZpbGUtdG8tdmF1bHRcIixcbiAgICAgIG5hbWU6IFRSQU5TRkVSX01PREVfTUVUQURBVEEuY29weS5jb21tYW5kTmFtZSxcbiAgICAgIGNoZWNrQ2FsbGJhY2s6IChjaGVja2luZykgPT4gdGhpcy5oYW5kbGVBY3RpdmVGaWxlQ29tbWFuZChcImNvcHlcIiwgY2hlY2tpbmcpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJtb3ZlLWFjdGl2ZS1maWxlLXRvLXZhdWx0XCIsXG4gICAgICBuYW1lOiBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBLm1vdmUuY29tbWFuZE5hbWUsXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHRoaXMuaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQoXCJtb3ZlXCIsIGNoZWNraW5nKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlQWN0aXZlRmlsZUNvbW1hbmQobW9kZTogVHJhbnNmZXJNb2RlLCBjaGVja2luZzogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoY2hlY2tpbmcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLm9wZW5UYXJnZXRNb2RhbChtb2RlLCBbYWN0aXZlRmlsZV0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckNvbnRleHRNZW51cygpOiB2b2lkIHtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKFwiZmlsZS1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIFtmaWxlXSk7XG4gICAgfSkpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlcy1tZW51XCIsIChtZW51OiBNZW51LCBmaWxlczogVEFic3RyYWN0RmlsZVtdKSA9PiB7XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zKG1lbnUsIGZpbGVzKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JJbnRlZ3JhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnRyeVJlZ2lzdGVyTm90ZWJvb2tOYXZpZ2F0b3JNZW51cygpO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMudHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk7XG4gICAgfSkpO1xuXG4gICAgaWYgKCF0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICB0aGlzLm5vdGVib29rTmF2aWdhdG9yUmV0cnlJbnRlcnZhbElkID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgdGhpcy50cnlSZWdpc3Rlck5vdGVib29rTmF2aWdhdG9yTWVudXMoKTtcbiAgICAgIH0sIDIwMDApO1xuICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdHJ5UmVnaXN0ZXJOb3RlYm9va05hdmlnYXRvck1lbnVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5vdGVib29rTmF2aWdhdG9yTWVudXNSZWdpc3RlcmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vdGVib29rTmF2aWdhdG9yID0gKCh0aGlzLmFwcCBhcyB1bmtub3duIGFzIHsgcGx1Z2lucz86IHsgcGx1Z2lucz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0gfSkucGx1Z2lucz8ucGx1Z2lucz8uW1wibm90ZWJvb2stbmF2aWdhdG9yXCJdIGFzIHtcbiAgICAgIGFwaT86IHtcbiAgICAgICAgbWVudXM/OiB7XG4gICAgICAgICAgcmVnaXN0ZXJGaWxlTWVudT86IChjYWxsYmFjazogKGNvbnRleHQ6IHVua25vd24pID0+IHZvaWQpID0+ICgoKSA9PiB2b2lkKSB8IHZvaWQ7XG4gICAgICAgICAgcmVnaXN0ZXJGb2xkZXJNZW51PzogKGNhbGxiYWNrOiAoY29udGV4dDogdW5rbm93bikgPT4gdm9pZCkgPT4gKCgpID0+IHZvaWQpIHwgdm9pZDtcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgfSB8IHVuZGVmaW5lZCk/LmFwaTtcblxuICAgIGlmICghbm90ZWJvb2tOYXZpZ2F0b3I/Lm1lbnVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlzcG9zZUZpbGVNZW51ID0gbm90ZWJvb2tOYXZpZ2F0b3IubWVudXMucmVnaXN0ZXJGaWxlTWVudT8uKChjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCBtZW51Q29udGV4dCA9IGdldEV4dGVybmFsTWVudUNvbnRleHQoY29udGV4dCk7XG4gICAgICBpZiAoIW1lbnVDb250ZXh0IHx8ICFtZW51Q29udGV4dC5hZGRJdGVtKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IEFycmF5LmlzQXJyYXkobWVudUNvbnRleHQuc2VsZWN0aW9uPy5maWxlcylcbiAgICAgICAgPyBtZW51Q29udGV4dC5zZWxlY3Rpb24uZmlsZXMuZmlsdGVyKGlzQWJzdHJhY3RGaWxlKVxuICAgICAgICA6IGlzQWJzdHJhY3RGaWxlKG1lbnVDb250ZXh0LmZpbGUpID8gW21lbnVDb250ZXh0LmZpbGVdIDogW107XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUobWVudUNvbnRleHQuYWRkSXRlbSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgICBpZiAodHlwZW9mIGRpc3Bvc2VGaWxlTWVudSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyKGRpc3Bvc2VGaWxlTWVudSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlzcG9zZUZvbGRlck1lbnUgPSBub3RlYm9va05hdmlnYXRvci5tZW51cy5yZWdpc3RlckZvbGRlck1lbnU/LigoY29udGV4dCkgPT4ge1xuICAgICAgY29uc3QgbWVudUNvbnRleHQgPSBnZXRFeHRlcm5hbE1lbnVDb250ZXh0KGNvbnRleHQpO1xuICAgICAgaWYgKCFtZW51Q29udGV4dCB8fCAhbWVudUNvbnRleHQuYWRkSXRlbSB8fCAhaXNBYnN0cmFjdEZpbGUobWVudUNvbnRleHQuZm9sZGVyKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUobWVudUNvbnRleHQuYWRkSXRlbSwgW21lbnVDb250ZXh0LmZvbGRlcl0pO1xuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZGlzcG9zZUZvbGRlck1lbnUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZWdpc3RlcihkaXNwb3NlRm9sZGVyTWVudSk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RlYm9va05hdmlnYXRvck1lbnVzUmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMubm90ZWJvb2tOYXZpZ2F0b3JSZXRyeUludGVydmFsSWQpO1xuICAgICAgdGhpcy5ub3RlYm9va05hdmlnYXRvclJldHJ5SW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRUcmFuc2Zlck1lbnVJdGVtcyhtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTZWxlY3Rpb24gPSB0aGlzLnBsYW5uZXIubm9ybWFsaXplU2VsZWN0aW9uKHNlbGVjdGlvbik7XG4gICAgaWYgKG5vcm1hbGl6ZWRTZWxlY3Rpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYWRkTW9kZU1lbnVJdGVtKG1lbnUsIG5vcm1hbGl6ZWRTZWxlY3Rpb24sIFwiY29weVwiKTtcbiAgICB0aGlzLmFkZE1vZGVNZW51SXRlbShtZW51LCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZFRyYW5zZmVyTWVudUl0ZW1zVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdKTogdm9pZCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbGVjdGlvbiA9IHRoaXMucGxhbm5lci5ub3JtYWxpemVTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICBpZiAobm9ybWFsaXplZFNlbGVjdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcImNvcHlcIik7XG4gICAgdGhpcy5hZGRNb2RlTWVudUl0ZW1Ub0V4dGVybmFsTWVudShhZGRJdGVtLCBub3JtYWxpemVkU2VsZWN0aW9uLCBcIm1vdmVcIik7XG4gIH1cblxuICBwcml2YXRlIGFkZE1vZGVNZW51SXRlbShtZW51OiBNZW51LCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgbW9kZTogVHJhbnNmZXJNb2RlKTogdm9pZCB7XG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTW9kZU1lbnVJdGVtVG9FeHRlcm5hbE1lbnUoYWRkSXRlbTogTWVudVtcImFkZEl0ZW1cIl0sIHNlbGVjdGlvbjogVEFic3RyYWN0RmlsZVtdLCBtb2RlOiBUcmFuc2Zlck1vZGUpOiB2b2lkIHtcbiAgICBhZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICB0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyTWVudUl0ZW0oaXRlbSwgc2VsZWN0aW9uLCBtb2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uZmlndXJlVHJhbnNmZXJNZW51SXRlbShpdGVtOiBNZW51SXRlbSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10sIG1vZGU6IFRyYW5zZmVyTW9kZSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gVFJBTlNGRVJfTU9ERV9NRVRBREFUQVttb2RlXTtcbiAgICBpdGVtLnNldFRpdGxlKG1ldGFkYXRhLm1lbnVUaXRsZSkuc2V0SWNvbihtZXRhZGF0YS5pY29uKTtcbiAgICBjb25zdCBzZWxlY3RhYmxlVGFyZ2V0cyA9IHRoaXMuZ2V0U2VsZWN0YWJsZVRhcmdldHMoKTtcbiAgICBpZiAoc2VsZWN0YWJsZVRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpdGVtLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgdGhpcy5vcGVuVGFyZ2V0TW9kYWwobW9kZSwgc2VsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlblRhcmdldE1vZGFsKG1vZGU6IFRyYW5zZmVyTW9kZSwgc2VsZWN0aW9uOiBUQWJzdHJhY3RGaWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5nZXRTZWxlY3RhYmxlVGFyZ2V0cygpO1xuICAgIGlmICh0YXJnZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShcIkFkZCBhIGRlc3RpbmF0aW9uIHZhdWx0IGZpcnN0LlwiLCA4MDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGl0bGUgPSBUUkFOU0ZFUl9NT0RFX01FVEFEQVRBW21vZGVdLnRhcmdldE1vZGFsVGl0bGU7XG4gICAgbmV3IFRhcmdldFZhdWx0U3VnZ2VzdE1vZGFsKHRoaXMuYXBwLCB0YXJnZXRzLCB0aXRsZSwgKHRhcmdldCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnJ1blRyYW5zZmVyKG1vZGUsIHNlbGVjdGlvbiwgdGFyZ2V0KTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGFibGVUYXJnZXRzKCk6IERlc3RpbmF0aW9uQ29uZmlnW10ge1xuICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnRhcmdldHMuZmlsdGVyKCh0YXJnZXQpID0+IHRhcmdldC5uYW1lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuVHJhbnNmZXIobW9kZTogVHJhbnNmZXJNb2RlLCBzZWxlY3Rpb246IFRBYnN0cmFjdEZpbGVbXSwgdGFyZ2V0OiBEZXN0aW5hdGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwbGFuID0gYXdhaXQgdGhpcy5wbGFubmVyLnByZXBhcmUoc2VsZWN0aW9uLCB0YXJnZXQpO1xuICAgICAgY29uc3QgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMgPSBhd2FpdCB0aGlzLm1heWJlUmV2aWV3UGxhbihwbGFuKTtcbiAgICAgIGlmIChjb25maXJtZWRTZWxlY3Rpb25QYXRocyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCB0aGlzLmV4ZWN1dG9yLmV4ZWN1dGUocGxhbiwgbW9kZSwgY29uZmlybWVkU2VsZWN0aW9uUGF0aHMpO1xuICAgICAgdGhpcy5zaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGUsIHN1bW1hcnkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJDb3VsZG4ndCBjb21wbGV0ZSB0aGUgdHJhbnNmZXIuXCIsIDEyMDAwKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1heWJlUmV2aWV3UGxhbihwbGFuOiBQcmVwYXJlZFRyYW5zZmVyUGxhbik6IFByb21pc2U8c3RyaW5nW10gfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiA9IHBsYW4uZXhwbGljaXRNYXJrZG93blBhdGhzLmxlbmd0aCA+IDA7XG4gICAgY29uc3QgaGFzUmVsZXZhbnRSZWxhdGlvbnNoaXBzID0gcGxhbi5yZXZpZXdSb290cy5zb21lKChyb290KSA9PiByb290LmNoaWxkcmVuLmxlbmd0aCA+IDApO1xuICAgIGlmICghaGFzUmV2aWV3YWJsZVNlbGVjdGlvbiB8fCB0aGlzLnNldHRpbmdzLnJldmlld0RpYWxvZ01vZGUgPT09IFwibmV2ZXJcIikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmV2aWV3RGlhbG9nTW9kZSA9PT0gXCJsaW5rZWQtb25seVwiICYmICFoYXNSZWxldmFudFJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5ldyBSZXZpZXdTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgcGxhbi5yZXZpZXdSb290cywgdGhpcy5zZXR0aW5ncy5jb25mbGljdFN0cmF0ZWd5KS53YWl0Rm9yUmVzdWx0KCk7XG4gICAgaWYgKCFyZXN1bHQuY29uZmlybWVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5zZWxlY3RlZFBhdGhzO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93VHJhbnNmZXJTdW1tYXJ5Tm90aWNlKG1vZGU6IFRyYW5zZmVyTW9kZSwgc3VtbWFyeTogVHJhbnNmZXJTdW1tYXJ5KTogdm9pZCB7XG4gICAgY29uc3QgY29tcGxldGVkQ291bnQgPSBtb2RlID09PSBcImNvcHlcIiA/IHN1bW1hcnkudHJhbnNmZXJyZWRGaWxlQ291bnQgOiBzdW1tYXJ5Lm1vdmVkRmlsZUNvdW50O1xuICAgIGNvbnN0IGFjdGlvbiA9IG1vZGUgPT09IFwiY29weVwiID8gXCJDb3B5IGNvbXBsZXRlXCIgOiBcIk1vdmUgY29tcGxldGVcIjtcbiAgICBjb25zdCBwYXJ0cyA9IFtgJHtjb21wbGV0ZWRDb3VudH0gb2YgJHtzdW1tYXJ5LnJlcXVlc3RlZEZpbGVDb3VudH0gaXRlbXMgdHJhbnNmZXJyZWRgXTtcbiAgICBpZiAoc3VtbWFyeS5yZW5hbWVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkucmVuYW1lZENvdW50LCBcIml0ZW0gcmVuYW1lZFwiLCBcIml0ZW1zIHJlbmFtZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCwgXCJpdGVtIHNraXBwZWRcIiwgXCJpdGVtcyBza2lwcGVkXCIpKTtcbiAgICB9XG4gICAgaWYgKHN1bW1hcnkuZmFpbGVkQ291bnQgPiAwKSB7XG4gICAgICBwYXJ0cy5wdXNoKGZvcm1hdENvdW50KHN1bW1hcnkuZmFpbGVkQ291bnQsIFwiaXRlbSBmYWlsZWRcIiwgXCJpdGVtcyBmYWlsZWRcIikpO1xuICAgIH1cbiAgICBpZiAoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGggPiAwICYmIHN1bW1hcnkuc2tpcHBlZENvbmZsaWN0Q291bnQgPT09IDApIHtcbiAgICAgIHBhcnRzLnB1c2goZm9ybWF0Q291bnQoc3VtbWFyeS53YXJuaW5ncy5sZW5ndGgsIFwid2FybmluZ1wiLCBcIndhcm5pbmdzXCIpKTtcbiAgICB9XG5cbiAgICBpZiAoc3VtbWFyeS5za2lwcGVkQ29uZmxpY3RDb3VudCA+IDApIHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gY3JlYXRlRnJhZ21lbnQoKTtcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGZyYWdtZW50LmNyZWF0ZURpdih7IGNsczogXCJ0cmFuc3ZhdWx0LXNraXAtbm90aWNlXCIgfSk7XG4gICAgICBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2UtdGl0bGVcIiwgdGV4dDogYCR7YWN0aW9ufSB3aXRoIHdhcm5pbmdzOiAke3BhcnRzLmpvaW4oXCIsIFwiKX0uYCB9KTtcbiAgICAgIGNvbnN0IHNob3duRW50cmllcyA9IHN1bW1hcnkuc2tpcHBlZEVudHJpZXMuc2xpY2UoMCwgMTApO1xuICAgICAgY29uc3QgbGlzdCA9IGNvbnRhaW5lci5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2UtbGlzdFwiIH0pO1xuICAgICAgZm9yIChjb25zdCBza2lwcGVkIG9mIHNob3duRW50cmllcykge1xuICAgICAgICBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyB0ZXh0OiBza2lwcGVkIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHN1bW1hcnkuc2tpcHBlZEVudHJpZXMubGVuZ3RoID4gc2hvd25FbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInRyYW5zdmF1bHQtc2tpcC1ub3RpY2UtbW9yZVwiLCB0ZXh0OiBgLi4uIGFuZCAke2Zvcm1hdENvdW50KHN1bW1hcnkuc2tpcHBlZEVudHJpZXMubGVuZ3RoIC0gc2hvd25FbnRyaWVzLmxlbmd0aCwgXCJtb3JlIHNraXBwZWQgaXRlbVwiLCBcIm1vcmUgc2tpcHBlZCBpdGVtc1wiKX0uYCB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwidHJhbnN2YXVsdC1za2lwLW5vdGljZS1kaXNtaXNzXCIsIHRleHQ6IFwiQ2xpY2sgdG8gZGlzbWlzc1wiIH0pO1xuICAgICAgY29uc3Qgbm90aWNlID0gbmV3IE5vdGljZShmcmFnbWVudCwgMCk7XG4gICAgICBub3RpY2UubWVzc2FnZUVsLmFkZENsYXNzKFwidHJhbnN2YXVsdC1ub3RpY2UtY2xpY2thYmxlXCIpO1xuICAgICAgbm90aWNlLm1lc3NhZ2VFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICBub3RpY2UuaGlkZSgpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbmV3IE5vdGljZShgJHthY3Rpb259OiAke3BhcnRzLmpvaW4oXCIsIFwiKX0uYCwgMTAwMDApO1xuICB9XG59IiwgIiMgVHJhbnMgVmF1bHQgUmVsZWFzZSBOb3Rlc1xuXG4jIyBWZXJzaW9uIDEuMS4wXG5cbiMjIyBBZGRlZFxuXG4tIFJlbGVhc2Ugbm90ZXMgY2FuIG5vdyBiZSB2aWV3ZWQgZnJvbSB0aGUgc2V0dGluZ3MgbWVudS5cblxuIyMjIENoYW5nZWRcblxuLSBUaGUgZGV0ZWN0aW9uIG9mIHRoZSBkZWZhdWx0IGF0dGFjaG1lbnQgcGF0aCBpbiB0aGUgZGVzdGluYXRpb24gdmF1bHQgZGVmYXVsdHMgbm93IHRvIFwib2ZmXCIuIE5vIHVzZXIgaW50ZXJhY3Rpb24gaXMgcmVxdWlyZWQsIGFzIHByZXZpb3VzIHNldHRpbmdzIHdpbGwgbm90IGJlIGNoYW5nZWQuXG5cblxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUFlO0FBQ2YsZ0JBQWU7QUFDZixrQkFBaUI7QUFDakIsc0JBdUJPOzs7QUMxQlA7OztBRG1JQSxTQUFTLFNBQVMsT0FBa0Q7QUFDbEUsU0FBTyxPQUFPLFVBQVUsWUFBWSxVQUFVO0FBQ2hEO0FBRUEsU0FBUyxlQUFlLE9BQXdDO0FBQzlELFNBQU8saUJBQWlCLHlCQUFTLGlCQUFpQjtBQUNwRDtBQUVBLFNBQVMsdUJBQXVCLE9BQTRDO0FBQzFFLE1BQUksQ0FBQyxTQUFTLEtBQUssR0FBRztBQUNwQixXQUFPO0FBQUEsRUFDVDtBQUNBLFFBQU0sWUFBWSxTQUFTLE1BQU0sU0FBUyxLQUFLLE1BQU0sUUFBUSxNQUFNLFVBQVUsS0FBSyxJQUM5RSxFQUFFLE9BQU8sTUFBTSxVQUFVLE1BQU0sSUFDL0I7QUFDSixTQUFPO0FBQUEsSUFDTCxTQUFTLE9BQU8sTUFBTSxZQUFZLGFBQWEsTUFBTSxVQUE2QjtBQUFBLElBQ2xGLE1BQU0sTUFBTTtBQUFBLElBQ1osUUFBUSxNQUFNO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFDRjtBQVlBLElBQU0sbUJBQXVDO0FBQUEsRUFDM0Msa0JBQWtCO0FBQUEsRUFDbEIsb0JBQW9CO0FBQUEsRUFDcEIsa0JBQWtCO0FBQUEsRUFDbEIsdUJBQXVCO0FBQUEsRUFDdkIsNkJB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
