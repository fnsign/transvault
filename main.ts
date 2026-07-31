import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  App,
  Component,
  FileSystemAdapter,
  FuzzyMatch,
  FuzzySuggestModal,
  Menu,
  MenuItem,
  MarkdownRenderer,
  Modal,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  TFolder,
  getLinkpath,
  normalizePath,
  parseYaml,
  setIcon,
  stringifyYaml,
} from "obsidian";
import releaseNotes from "./RELEASENOTES.md";

type TransferMode = "copy" | "move";
type ConflictStrategy = "skip" | "auto-rename" | "overwrite";
type ReviewDirection = "to" | "from";
type ReviewNodeType = "note" | "group" | "attachment";
type ReviewDialogMode = "always" | "linked-only" | "never";

interface DestinationConfig {
  id: string;
  name: string;
  vaultPath: string;
  destinationPath: string;
  useDefaultAttachmentLocation: boolean;
  attachmentPath: string;
}

interface TransVaultSettings {
  conflictStrategy: ConflictStrategy;
  includeLinkedFiles: boolean;
  reviewDialogMode: ReviewDialogMode;
  tagsForCopiedElements: string;
  alsoTagCopiedSourceElements: boolean;
  tagsForMovedElements: string;
  targets: DestinationConfig[];
}

interface ReviewNode {
  id: string;
  type: ReviewNodeType;
  label: string;
  filePath?: string;
  direction?: ReviewDirection;
  children: ReviewNode[];
}

interface DirectDependencies {
  markdown: Set<string>;
  attachments: Set<string>;
}

interface DirectRelationships extends DirectDependencies {
  backlinks: Set<string>;
}

interface ExplicitFileSelection {
  file: TFile;
  destinationRelativePath: string;
}

interface ResolvedDestinationConfig extends DestinationConfig {
  vaultPath: string;
  destinationPath: string;
  effectiveAttachmentPath: string;
}

interface PreparedTransferPlan {
  sourceVaultRoot: string;
  target: ResolvedDestinationConfig;
  explicitFiles: ExplicitFileSelection[];
  explicitMarkdownPaths: string[];
  selectedFolderPaths: string[];
  reviewRoots: ReviewNode[];
  directDependencies: Map<string, DirectDependencies>;
  directMarkdownRelations: Map<string, Set<string>>;
}

interface DraftTransferEntry {
  sourceFile: TFile;
  sourceAbsolutePath: string;
  sourceVaultRelativePath: string;
  destinationAbsolutePath: string;
  destinationVaultRelativePath: string;
  shouldRewriteLinks: boolean;
  isExplicitSelection: boolean;
  wasRenamed: boolean;
  overwriteExisting: boolean;
}

type FinalizedTransferEntry = DraftTransferEntry;

interface TransferSummary {
  requestedFileCount: number;
  transferredFileCount: number;
  movedFileCount: number;
  skippedConflictCount: number;
  renamedCount: number;
  failedCount: number;
  skippedEntries: string[];
  warnings: string[];
}

interface ReviewModalResult {
  confirmed: boolean;
  selectedPaths: string[];
}

interface ExternalMenuContext {
  addItem?: Menu["addItem"];
  file?: unknown;
  folder?: unknown;
  selection?: { files?: unknown[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbstractFile(value: unknown): value is TAbstractFile {
  return value instanceof TFile || value instanceof TFolder;
}

function getExternalMenuContext(value: unknown): ExternalMenuContext | null {
  if (!isRecord(value)) {
    return null;
  }
  const selection = isRecord(value.selection) && Array.isArray(value.selection.files)
    ? { files: value.selection.files }
    : undefined;
  return {
    addItem: typeof value.addItem === "function" ? value.addItem as Menu["addItem"] : undefined,
    file: value.file,
    folder: value.folder,
    selection,
  };
}

interface FrontmatterTagResult {
  content: string;
  warning?: string;
}

interface ParsedMarkdownHref {
  path: string;
  wrappedInAngles: boolean;
}

const DEFAULT_SETTINGS: TransVaultSettings = {
  conflictStrategy: "skip",
  includeLinkedFiles: true,
  reviewDialogMode: "always",
  tagsForCopiedElements: "",
  alsoTagCopiedSourceElements: false,
  tagsForMovedElements: "",
  targets: [],
};

const TRANSFER_MODE_METADATA: Record<TransferMode, {
  menuTitle: string;
  commandName: string;
  targetModalTitle: string;
  icon: string;
}> = {
  copy: {
    menuTitle: "Copy to vault...",
    commandName: "Copy active file to vault...",
    targetModalTitle: "Choose a vault to copy to",
    icon: "copy-plus",
  },
  move: {
    menuTitle: "Move to vault...",
    commandName: "Move active file to vault...",
    targetModalTitle: "Choose a vault to move to",
    icon: "folder-symlink",
  },
};

const CONFLICT_STRATEGY_METADATA: Record<ConflictStrategy, {
  label: string;
  description: string;
}> = {
  skip: {
    label: "Skip",
    description: "Existing destination files will be skipped during transfer.",
  },
  "auto-rename": {
    label: "Auto-rename",
    description: "Existing destination files will be kept, and new copies will be renamed automatically.",
  },
  overwrite: {
    label: "Overwrite",
    description: "Existing destination files will be replaced during transfer.",
  },
};

function createDestinationId(): string {
  return `destination-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlankDestination(): DestinationConfig {
  return {
    id: createDestinationId(),
    name: "",
    vaultPath: "",
    destinationPath: "",
    useDefaultAttachmentLocation: false,
    attachmentPath: "",
  };
}

function getDestinationDisplayName(target: DestinationConfig): string {
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

function getConflictStrategyLabel(strategy: ConflictStrategy): string {
  return CONFLICT_STRATEGY_METADATA[strategy].label;
}

function getConflictStrategyDescription(strategy: ConflictStrategy): string {
  return CONFLICT_STRATEGY_METADATA[strategy].description;
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeAbsolutePath(value: string): string {
  return path.normalize(path.resolve(value));
}

function normalizeConfiguredPathInput(value: string): string {
  let normalized = value.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  if (process.platform !== "win32") {
    if (normalized === "~") {
      normalized = os.homedir();
    } else if (normalized.startsWith("~/")) {
      normalized = path.join(os.homedir(), normalized.slice(2));
    } else if (normalized.startsWith("$HOME/")) {
      normalized = path.join(os.homedir(), normalized.slice("$HOME/".length));
    }
    normalized = normalized.replace(/\\([ !#$&'()*;<>?@[\]^`{|}~])/g, "$1");
  }
  return normalized;
}

function ensureAbsolutePath(value: string, label: string): string {
  const trimmed = normalizeConfiguredPathInput(value);
  if (trimmed.length === 0) {
    throw new Error(`${label} is required.`);
  }
  if (!path.isAbsolute(trimmed)) {
    throw new Error(`${label} must be an absolute path.`);
  }
  return normalizeAbsolutePath(trimmed);
}

function toVaultRelativePath(vaultRoot: string, absolutePath: string): string {
  return normalizePath(path.relative(vaultRoot, absolutePath).split(path.sep).join("/"));
}

function cleanTagInput(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().replace(/^#+/, ""))
    .filter((entry, index, items) => entry.length > 0 && items.indexOf(entry) === index);
}

function joinTagValues(existing: string[], additions: string[]): string[] {
  const normalized = new Set<string>();
  for (const tag of [...existing, ...additions]) {
    const clean = tag.trim().replace(/^#+/, "");
    if (clean.length > 0) {
      normalized.add(clean);
    }
  }
  return [...normalized];
}

function collectFrontmatterRange(content: string): { range: [number, number]; body: string } | null | "invalid" {
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
    body: match[1],
  };
}

function getExistingTagFormatting(frontmatterBody: string): "array" | "comma" | "space" | "string" | "unknown" {
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

function extractExistingTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
      .map((entry) => entry.trim().replace(/^#+/, ""))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    const separator = value.includes(",") ? "," : /\s+/;
    return value
      .split(separator)
      .map((entry) => entry.trim().replace(/^#+/, ""))
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function isMarkdownFile(file: TFile): boolean {
  return file.extension.toLowerCase() === "md";
}

function hasSelectedAncestor(filePath: string, selectedPaths: Set<string>): boolean {
  const parts = normalizePath(filePath).split("/");
  for (let index = 1; index < parts.length; index += 1) {
    if (selectedPaths.has(parts.slice(0, index).join("/"))) {
      return true;
    }
  }
  return false;
}

class DestinationResolver {
  constructor(private readonly configDir: string) {}

  async resolve(target: DestinationConfig): Promise<ResolvedDestinationConfig> {
    const vaultPath = ensureAbsolutePath(target.vaultPath, "Destination vault path");
    const destinationPath = ensureAbsolutePath(target.destinationPath, "Destination path");
    const effectiveAttachmentPath = target.useDefaultAttachmentLocation
      ? await this.resolveDefaultAttachmentPath(vaultPath)
      : ensureAbsolutePath(target.attachmentPath, "Attachment path");

    await this.assertDirectoryExists(vaultPath, "Destination vault path");
    this.assertInsideVault(vaultPath, destinationPath, "Destination path");
    this.assertInsideVault(vaultPath, effectiveAttachmentPath, "Attachment path");
    await fs.mkdir(destinationPath, { recursive: true });
    await fs.mkdir(effectiveAttachmentPath, { recursive: true });

    return {
      ...target,
      vaultPath,
      destinationPath,
      effectiveAttachmentPath,
      attachmentPath: target.attachmentPath.trim(),
    };
  }

  validate(target: DestinationConfig): string[] {
    const errors: string[] = [];
    const trimmedVaultPath = normalizeConfiguredPathInput(target.vaultPath);
    const trimmedDestinationPath = normalizeConfiguredPathInput(target.destinationPath);
    const trimmedAttachmentPath = normalizeConfiguredPathInput(target.attachmentPath);

    if (trimmedVaultPath.length === 0) {
      errors.push("Destination vault path is required.");
    } else if (!path.isAbsolute(trimmedVaultPath)) {
      errors.push("Destination vault path must be absolute.");
    }

    if (trimmedDestinationPath.length === 0) {
      errors.push("Destination path is required.");
    } else if (!path.isAbsolute(trimmedDestinationPath)) {
      errors.push("Destination path must be absolute.");
    } else if (path.isAbsolute(trimmedVaultPath) && !this.isInsideVault(trimmedVaultPath, trimmedDestinationPath)) {
      errors.push("Destination path must be inside the destination vault.");
    }

    if (!target.useDefaultAttachmentLocation) {
      if (trimmedAttachmentPath.length === 0) {
        errors.push("Attachment path is required when automatic attachment detection is disabled.");
      } else if (!path.isAbsolute(trimmedAttachmentPath)) {
        errors.push("Attachment path must be absolute.");
      } else if (path.isAbsolute(trimmedVaultPath) && !this.isInsideVault(trimmedVaultPath, trimmedAttachmentPath)) {
        errors.push("Attachment path must be inside the destination vault.");
      }
    }

    return errors;
  }

  async resolveDefaultAttachmentPath(vaultPath: string): Promise<string> {
    const normalizedVaultPath = normalizeAbsolutePath(vaultPath);
    const configPath = path.join(normalizedVaultPath, this.configDir, "app.json");
    try {
      const raw = await fs.readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as { attachmentFolderPath?: string };
      const attachmentFolderPath = parsed.attachmentFolderPath?.trim();
      if (!attachmentFolderPath) {
        return normalizedVaultPath;
      }
      const resolved = normalizeAbsolutePath(path.resolve(normalizedVaultPath, attachmentFolderPath));
      if (!this.isInsideVault(normalizedVaultPath, resolved)) {
        return normalizedVaultPath;
      }
      return resolved;
    } catch {
      return normalizedVaultPath;
    }
  }

  private async assertDirectoryExists(directoryPath: string, label: string): Promise<void> {
    try {
      const stat = await fs.stat(directoryPath);
      if (!stat.isDirectory()) {
        throw new Error(`${label} must point to a directory.`);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new Error(`${label} does not exist.`);
      }
      throw error;
    }
  }

  private assertInsideVault(vaultPath: string, candidatePath: string, label: string): void {
    if (!this.isInsideVault(vaultPath, candidatePath)) {
      throw new Error(`${label} must be inside the destination vault.`);
    }
  }

  private isInsideVault(vaultPath: string, candidatePath: string): boolean {
    const relative = path.relative(normalizeAbsolutePath(vaultPath), normalizeAbsolutePath(candidatePath));
    return !(relative.startsWith("..") || path.isAbsolute(relative));
  }
}

class TransferPlanner {
  constructor(private readonly plugin: TransVaultPlugin, private readonly destinationResolver: DestinationResolver) {}

  async prepare(selection: TAbstractFile[], target: DestinationConfig): Promise<PreparedTransferPlan> {
    const sourceVaultRoot = this.getSourceVaultRoot();
    const resolvedTarget = await this.destinationResolver.resolve(target);
    const normalizedSelection = this.normalizeSelection(selection);
    const explicitFiles = this.collectExplicitFiles(normalizedSelection);

    if (explicitFiles.length === 0) {
      throw new Error("The selection does not contain any files to transfer.");
    }

    const explicitMarkdownFiles = explicitFiles.map((entry) => entry.file).filter(isMarkdownFile);
    const reviewRoots: ReviewNode[] = [];
    const directDependencies = new Map<string, DirectDependencies>();
    const directMarkdownRelations = new Map<string, Set<string>>();
    const relationshipsCache = new Map<string, DirectRelationships>();

    const getRelationships = (file: TFile): DirectRelationships => {
      const cached = relationshipsCache.get(file.path);
      if (cached) {
        return cached;
      }
      const relationships = this.collectDirectRelationships(file);
      relationshipsCache.set(file.path, relationships);
      directDependencies.set(file.path, {
        markdown: relationships.markdown,
        attachments: relationships.attachments,
      });
      return relationships;
    };

    for (const file of explicitMarkdownFiles) {
      const relationships = getRelationships(file);
      directMarkdownRelations.set(file.path, new Set<string>([
        ...relationships.markdown,
        ...relationships.backlinks,
      ]));

      const groups: ReviewNode[] = this.createAttachmentGroup(file.path, file.path, getRelationships);
      if (relationships.markdown.size > 0) {
        groups.push({
          id: `${file.path}::to-group`,
          type: "group",
          label: "links to",
          direction: "to",
          children: [...relationships.markdown]
            .sort((left, right) => left.localeCompare(right))
            .map((notePath) => this.createNoteNode(file.path, "to", notePath, getRelationships)),
        });
      }
      if (relationships.backlinks.size > 0) {
        groups.push({
          id: `${file.path}::from-group`,
          type: "group",
          label: "links from",
          direction: "from",
          children: [...relationships.backlinks]
            .sort((left, right) => left.localeCompare(right))
            .map((notePath) => this.createNoteNode(file.path, "from", notePath, getRelationships)),
        });
      }
      reviewRoots.push({
        id: `${file.path}::root`,
        type: "note",
        label: file.basename,
        filePath: file.path,
        children: groups,
      });
    }

    return {
      sourceVaultRoot,
      target: resolvedTarget,
      explicitFiles,
      explicitMarkdownPaths: explicitMarkdownFiles.map((file) => file.path),
      selectedFolderPaths: normalizedSelection.filter((entry): entry is TFolder => entry instanceof TFolder).map((folder) => folder.path),
      reviewRoots,
      directDependencies,
      directMarkdownRelations,
    };
  }

  normalizeSelection(selection: TAbstractFile[]): TAbstractFile[] {
    const unique = new Map<string, TAbstractFile>();
    for (const entry of selection) {
      unique.set(normalizePath(entry.path), entry);
    }
    const selectedPaths = new Set(unique.keys());
    return [...unique.values()].filter((entry) => !hasSelectedAncestor(entry.path, selectedPaths));
  }

  private getSourceVaultRoot(): string {
    const adapter = this.plugin.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error("Trans Vault requires a desktop file system adapter.");
    }
    return normalizeAbsolutePath(adapter.getBasePath());
  }

  private collectExplicitFiles(selection: TAbstractFile[]): ExplicitFileSelection[] {
    const explicitFiles: ExplicitFileSelection[] = [];
    for (const entry of selection) {
      if (entry instanceof TFile) {
        explicitFiles.push({
          file: entry,
          destinationRelativePath: path.posix.basename(normalizePath(entry.path)),
        });
        continue;
      }
      if (entry instanceof TFolder) {
        this.collectFolderFiles(entry, entry, explicitFiles);
      }
    }
    return explicitFiles;
  }

  private collectFolderFiles(folder: TFolder, rootFolder: TFolder, sink: ExplicitFileSelection[]): void {
    for (const child of folder.children) {
      if (child instanceof TFile) {
        const relativeInsideRoot = path.posix.relative(normalizePath(rootFolder.path), normalizePath(child.path));
        sink.push({
          file: child,
          destinationRelativePath: normalizePath(path.posix.join(rootFolder.name, relativeInsideRoot)),
        });
      } else if (child instanceof TFolder) {
        this.collectFolderFiles(child, rootFolder, sink);
      }
    }
  }

  private createNoteNode(
    rootPath: string,
    direction: ReviewDirection,
    notePath: string,
    getRelationships: (file: TFile) => DirectRelationships,
  ): ReviewNode {
    const file = this.plugin.app.vault.getFileByPath(notePath);
    const children = file && isMarkdownFile(file)
      ? this.createAttachmentGroup(`${rootPath}::${direction}::${notePath}`, file.path, getRelationships)
      : [];
    return {
      id: `${rootPath}::${direction}::${notePath}`,
      type: "note",
      label: file?.basename ?? path.posix.basename(notePath, ".md"),
      filePath: notePath,
      children,
    };
  }

  private createAttachmentGroup(
    branchId: string,
    notePath: string,
    getRelationships: (file: TFile) => DirectRelationships,
  ): ReviewNode[] {
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
      children: [...relationships.attachments]
        .sort((left, right) => left.localeCompare(right))
        .map((attachmentPath) => this.createAttachmentNode(branchId, attachmentPath)),
    }];
  }

  private createAttachmentNode(branchId: string, attachmentPath: string): ReviewNode {
    const file = this.plugin.app.vault.getFileByPath(attachmentPath);
    return {
      id: `${branchId}::attachment::${attachmentPath}`,
      type: "attachment",
      label: file?.name ?? path.posix.basename(attachmentPath),
      filePath: attachmentPath,
      children: [],
    };
  }

  private collectDirectRelationships(file: TFile): DirectRelationships {
    const markdown = new Set<string>();
    const attachments = new Set<string>();
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    for (const ref of [...(cache?.links ?? []), ...(cache?.embeds ?? []), ...(cache?.frontmatterLinks ?? [])]) {
      const destination = this.plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(ref.link), file.path);
      if (!(destination instanceof TFile)) {
        continue;
      }
      if (isMarkdownFile(destination)) {
        markdown.add(destination.path);
      } else {
        attachments.add(destination.path);
      }
    }

    const backlinks = new Set<string>();
    const resolvedLinks = (this.plugin.app.metadataCache as unknown as {
      resolvedLinks?: Record<string, Record<string, number>>;
    }).resolvedLinks ?? {};
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
      attachments,
    };
  }
}

class TransferExecutor {
  constructor(private readonly plugin: TransVaultPlugin) {}

  async execute(plan: PreparedTransferPlan, mode: TransferMode, confirmedSelectionPaths?: string[]): Promise<TransferSummary> {
    const selectedReviewPaths = confirmedSelectionPaths
      ? new Set<string>(confirmedSelectionPaths)
      : undefined;
    const selectedMarkdownPaths = selectedReviewPaths
      ? new Set<string>([...selectedReviewPaths].filter((entry) => this.isSelectedMarkdownPath(entry)))
      : new Set<string>(plan.explicitMarkdownPaths);

    const draftEntries = new Map<string, DraftTransferEntry>();

    for (const entry of plan.explicitFiles) {
      if (isMarkdownFile(entry.file) && !selectedMarkdownPaths.has(entry.file.path)) {
        continue;
      }
      draftEntries.set(
        entry.file.path,
        this.createDraftEntry(plan, entry.file, true, entry.destinationRelativePath),
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

    const summary: TransferSummary = {
      requestedFileCount: draftEntries.size,
      transferredFileCount: 0,
      movedFileCount: 0,
      skippedConflictCount: 0,
      renamedCount: 0,
      failedCount: 0,
      skippedEntries: [],
      warnings: [],
    };

    const resolvedEntries = await this.resolveConflicts(plan, [...draftEntries.values()], summary);
    const destinationMap = new Map<string, string>();
    for (const entry of resolvedEntries) {
      destinationMap.set(entry.sourceVaultRelativePath, entry.destinationVaultRelativePath);
    }

    const transferredFiles: TFile[] = [];
    for (const entry of resolvedEntries) {
      try {
        await fs.mkdir(path.dirname(entry.destinationAbsolutePath), { recursive: true });
        if (entry.overwriteExisting) {
          await fs.rm(entry.destinationAbsolutePath, { recursive: true, force: true });
        }

        if (entry.shouldRewriteLinks) {
          let content = await this.plugin.app.vault.cachedRead(entry.sourceFile);
          content = this.rewriteMarkdownLinks(content, entry.sourceVaultRelativePath, entry.destinationVaultRelativePath, destinationMap);
          const tagResult = this.applyDestinationTags(content, mode, entry.sourceVaultRelativePath);
          content = tagResult.content;
          if (tagResult.warning) {
            summary.warnings.push(tagResult.warning);
          }
          await fs.writeFile(entry.destinationAbsolutePath, content, "utf8");

          if (mode === "copy" && this.plugin.settings.alsoTagCopiedSourceElements) {
            const sourceTagResult = await this.tagSourceMarkdown(entry.sourceFile, this.getTagsForMode(mode));
            if (sourceTagResult) {
              summary.warnings.push(sourceTagResult);
            }
          }
        } else {
          await fs.copyFile(entry.sourceAbsolutePath, entry.destinationAbsolutePath);
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

  private createDraftEntry(
    plan: PreparedTransferPlan,
    file: TFile,
    isExplicitSelection: boolean,
    explicitDestinationRelativePath?: string,
  ): DraftTransferEntry {
    const sourceVaultRelativePath = normalizePath(file.path);
    const sourceAbsolutePath = normalizeAbsolutePath(path.join(plan.sourceVaultRoot, ...sourceVaultRelativePath.split("/")));
    const destinationBase = !isExplicitSelection && !isMarkdownFile(file)
      ? plan.target.effectiveAttachmentPath
      : plan.target.destinationPath;
    const relativeDestination = explicitDestinationRelativePath ?? path.posix.basename(sourceVaultRelativePath);
    const destinationAbsolutePath = normalizeAbsolutePath(
      path.join(destinationBase, ...normalizePath(relativeDestination).split("/")),
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
      overwriteExisting: false,
    };
  }

  private isSelectedMarkdownPath(filePath: string): boolean {
    const file = this.plugin.app.vault.getFileByPath(filePath);
    return !!file && isMarkdownFile(file);
  }

  private async resolveConflicts(
    plan: PreparedTransferPlan,
    entries: DraftTransferEntry[],
    summary: TransferSummary,
  ): Promise<FinalizedTransferEntry[]> {
    const reservedPaths = new Set<string>();
    const resolved: FinalizedTransferEntry[] = [];

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
        overwriteExisting: this.plugin.settings.conflictStrategy === "overwrite" && !wasRenamed && alreadyExists,
      });
    }

    return resolved;
  }

  private rewriteMarkdownLinks(
    content: string,
    sourceVaultRelativePath: string,
    destinationVaultRelativePath: string,
    destinationMap: Map<string, string>,
  ): string {
    let rewritten = content.replace(/(!)?\[\[([^\]]+)\]\]/g, (match, embedPrefix: string | undefined, inner: string) => {
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

    rewritten = rewritten.replace(/(!)?\[([^\]]*)\]\(([^)]+)\)/g, (match, embedPrefix: string | undefined, label: string, rawHref: string) => {
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

  private resolveReference(linkText: string, sourceVaultRelativePath: string): { targetFile: TFile; subpath: string } | null {
    const hashIndex = linkText.indexOf("#");
    const rawPath = hashIndex >= 0 ? linkText.slice(0, hashIndex) : linkText;
    const subpath = hashIndex >= 0 ? linkText.slice(hashIndex) : "";
    const decodedPath = decodeURIComponent(rawPath.trim());
    if (decodedPath.length === 0) {
      return null;
    }
    const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(decodedPath), sourceVaultRelativePath);
    if (!targetFile) {
      return null;
    }
    return { targetFile, subpath };
  }

  private parseMarkdownHref(rawHref: string): ParsedMarkdownHref | null {
    const trimmed = rawHref.trim();
    if (trimmed.startsWith("#") || /^[a-z]+:/i.test(trimmed)) {
      return null;
    }
    const wrappedInAngles = trimmed.startsWith("<") && trimmed.endsWith(">") && trimmed.length > 2;
    return {
      path: wrappedInAngles ? trimmed.slice(1, -1) : trimmed,
      wrappedInAngles,
    };
  }

  private toWikiLinkPath(currentDestination: string, targetDestination: string, extension: string): string {
    const relativeLink = this.toRelativeLink(currentDestination, targetDestination);
    return extension.toLowerCase() === "md" ? relativeLink.replace(/\.md$/i, "") : relativeLink;
  }

  private toRelativeLink(fromFile: string, toFile: string): string {
    const relative = normalizePath(path.posix.relative(path.posix.dirname(fromFile), toFile));
    return relative.length > 0 ? relative : path.posix.basename(toFile);
  }

  private encodeMarkdownLinkPath(linkPath: string): string {
    return encodeURI(linkPath);
  }

  private applyDestinationTags(content: string, mode: TransferMode, sourcePath: string): FrontmatterTagResult {
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

  private async tagSourceMarkdown(file: TFile, tags: string[]): Promise<string | null> {
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
      const format = frontmatterRange && frontmatterRange !== "invalid"
        ? getExistingTagFormatting(frontmatterRange.body)
        : "unknown";

      try {
        await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
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

  private addTagsToMarkdownContent(content: string, tags: string[]): FrontmatterTagResult {
    const frontmatterRange = collectFrontmatterRange(content);
    if (frontmatterRange === "invalid") {
      return { content, warning: "invalid frontmatter." };
    }

    const buildFrontmatter = (frontmatterBody: string | null): FrontmatterTagResult => {
      const format = frontmatterBody ? getExistingTagFormatting(frontmatterBody) : "unknown";
      let parsed: Record<string, unknown> = {};
      try {
        parsed = frontmatterBody ? ((parseYaml(frontmatterBody) as Record<string, unknown>) ?? {}) : {};
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
      const yamlBody = stringifyYaml(parsed).trimEnd();
      const nextFrontmatter = `---\n${yamlBody}\n---\n`;
      if (!frontmatterRange) {
        return { content: `${nextFrontmatter}${content}` };
      }
      return {
        content: `${nextFrontmatter}${content.slice(frontmatterRange.range[1])}`,
      };
    };

    if (!frontmatterRange) {
      return buildFrontmatter(null);
    }
    return buildFrontmatter(frontmatterRange.body);
  }

  private getTagsForMode(mode: TransferMode): string[] {
    return cleanTagInput(mode === "copy" ? this.plugin.settings.tagsForCopiedElements : this.plugin.settings.tagsForMovedElements);
  }

  private async deleteMovedSources(transferredFiles: TFile[], selectedFolderPaths: string[], summary: TransferSummary): Promise<number> {
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

  private async pathExists(candidatePath: string): Promise<boolean> {
    try {
      await fs.access(candidatePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findAvailablePath(candidatePath: string, reservedPaths: Set<string>, sourcePath: string): Promise<string> {
    const parsed = path.parse(candidatePath);
    let index = 1;
    let nextPath = candidatePath;
    while (reservedPaths.has(nextPath) || await this.pathExists(nextPath) || nextPath === sourcePath) {
      nextPath = path.join(parsed.dir, `${parsed.name} ${index}${parsed.ext}`);
      index += 1;
    }
    return nextPath;
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}

class TargetVaultSuggestModal extends FuzzySuggestModal<DestinationConfig> {
  constructor(
    app: App,
    private readonly targets: DestinationConfig[],
    placeholder: string,
    private readonly onChooseTarget: (target: DestinationConfig) => void,
  ) {
    super(app);
    this.setPlaceholder(placeholder);
    this.emptyStateText = "No destination vaults available.";
  }

  getItems(): DestinationConfig[] {
    return this.targets;
  }

  getItemText(target: DestinationConfig): string {
    return getDestinationDisplayName(target);
  }

  renderSuggestion(match: FuzzyMatch<DestinationConfig>, el: HTMLElement): void {
    const target = match.item;
    el.createDiv({ cls: "transvault-suggest-title", text: getDestinationDisplayName(target) });
    const detail = [target.vaultPath.trim(), target.destinationPath.trim()].filter((entry) => entry.length > 0).join(" -> ");
    if (detail.length > 0) {
      el.createDiv({ cls: "transvault-suggest-detail", text: detail });
    }
  }

  onChooseItem(target: DestinationConfig): void {
    this.onChooseTarget(target);
  }
}

class ReviewSelectionModal extends Modal {
  private readonly selectionState = new Map<string, boolean>();
  private readonly nodeElements = new Map<string, HTMLInputElement>();
  private resolvePromise: ((result: ReviewModalResult) => void) | null = null;

  constructor(
    app: App,
    private readonly roots: ReviewNode[],
    private readonly conflictStrategy: ConflictStrategy,
  ) {
    super(app);
    for (const root of roots) {
      this.initializeNodeState(root);
    }
  }

  async waitForResult(): Promise<ReviewModalResult> {
    return new Promise<ReviewModalResult>((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.modalEl.addClass("transvault-review-modal");
    this.titleEl.setText("Review linked notes");
    this.contentEl.empty();
    const conflictNotice = this.contentEl.createDiv({ cls: "transvault-review-conflict-notice" });
    conflictNotice.createSpan({
      cls: "transvault-review-conflict-badge",
      text: `Conflict handling: ${getConflictStrategyLabel(this.conflictStrategy)}`,
    });
    conflictNotice.createEl("p", {
      cls: "transvault-review-conflict-text",
      text: getConflictStrategyDescription(this.conflictStrategy),
    });
    this.contentEl.createEl("p", {
      text: "Review direct links and backlinks for the selected Markdown notes. The transfer includes every note instance that remains selected.",
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
        selectedPaths: [...this.getSelectedPaths()].sort((left, right) => left.localeCompare(right)),
      });
    });
  }

  onClose(): void {
    if (this.resolvePromise) {
      this.finish({ confirmed: false, selectedPaths: [] });
    }
  }

  private finish(result: ReviewModalResult): void {
    const resolve = this.resolvePromise;
    this.resolvePromise = null;
    this.close();
    resolve?.(result);
  }

  private initializeNodeState(node: ReviewNode): void {
    if (node.type === "note" || node.type === "attachment") {
      this.selectionState.set(node.id, true);
    }
    for (const child of node.children) {
      this.initializeNodeState(child);
    }
  }

  private renderNode(containerEl: HTMLElement, node: ReviewNode, depth: number): void {
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
        setIcon(iconEl, node.direction === "to" ? "links-going-out" : "links-coming-in");
      } else {
        setIcon(iconEl, "paperclip");
      }
    } else if (node.type === "attachment") {
      setIcon(iconEl, "paperclip");
    } else {
      setIcon(iconEl, node.children.length > 0 ? "file-text" : "file");
    }
    const label = row.createSpan({ cls: "transvault-review-label", text: node.label });
    label.addClass(`transvault-review-label-${node.type}`);

    const childrenContainer = item.createDiv({ cls: "transvault-review-children" });
    for (const child of node.children) {
      this.renderNode(childrenContainer, child, depth + 1);
    }
    this.updateCheckbox(node, checkbox, indicator);
  }

  private refreshTree(): void {
    for (const root of this.roots) {
      this.refreshNode(root);
    }
  }

  private refreshNode(node: ReviewNode): void {
    const checkbox = this.nodeElements.get(node.id);
    if (checkbox) {
      const indicator = checkbox.parentElement?.querySelector<HTMLElement>(".transvault-check-indicator") ?? null;
      if (indicator) {
        this.updateCheckbox(node, checkbox, indicator);
      }
    }
    for (const child of node.children) {
      this.refreshNode(child);
    }
  }

  private updateCheckbox(node: ReviewNode, checkbox: HTMLInputElement, indicator: HTMLElement): void {
    const state = this.getNodeStatus(node);
    checkbox.checked = state === "checked";
    checkbox.indeterminate = state === "mixed";
    indicator.textContent = state === "mixed" ? "-" : "";
    indicator.toggleClass("is-visible", state === "mixed");
    checkbox.dataset.state = state;
  }

  private getNodeStatus(node: ReviewNode): "checked" | "unchecked" | "mixed" {
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

  private combineStatuses(statuses: Array<"checked" | "unchecked" | "mixed">): "checked" | "unchecked" | "mixed" {
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

  private toggleNode(node: ReviewNode, checked: boolean): void {
    if (node.type === "note" || node.type === "attachment") {
      this.selectionState.set(node.id, checked);
    }
    for (const child of node.children) {
      this.toggleNode(child, checked);
    }
  }

  private getSelectedPaths(): Set<string> {
    const selected = new Set<string>();
    for (const root of this.roots) {
      this.collectSelectedPaths(root, selected);
    }
    return selected;
  }

  private collectSelectedPaths(node: ReviewNode, sink: Set<string>): void {
    if ((node.type === "note" || node.type === "attachment") && node.filePath && (this.selectionState.get(node.id) ?? false)) {
      sink.add(node.filePath);
    }
    for (const child of node.children) {
      this.collectSelectedPaths(child, sink);
    }
  }
}

// The installed 1.12 type definitions still require the legacy settings renderer.
// @ts-expect-error Obsidian 1.13 declarative settings tabs do not require the legacy renderer.
class TransVaultSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: TransVaultPlugin, private readonly destinationResolver: DestinationResolver) {
    super(app, plugin);
  }

  renderLegacySettings = (): void => {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Release notes")
      .setDesc("Read what changed in this version.")
      .addButton((button) => {
        button.setButtonText("Show release notes").setCta().onClick(() => {
          new ReleaseNotesModal(this.app).open();
        });
      });

    containerEl.createEl("br");

    this.addDropdownSetting(containerEl, {
      name: "Conflict handling",
      description: "Choose whether existing destination files are skipped, renamed automatically, or overwritten.",
      options: (Object.entries(CONFLICT_STRATEGY_METADATA) as Array<[ConflictStrategy, typeof CONFLICT_STRATEGY_METADATA[ConflictStrategy]]>)
        .map(([value, meta]) => ({ value, label: meta.label })),
      value: this.plugin.settings.conflictStrategy,
      onChange: async (value) => {
        this.plugin.settings.conflictStrategy = value;
        await this.plugin.saveSettings();
      },
    });

    this.addToggleSetting(containerEl, {
      name: "Include linked files",
      description: "Include directly related notes and linked non-Markdown files from selected notes.",
      value: this.plugin.settings.includeLinkedFiles,
      onChange: async (value) => {
        this.plugin.settings.includeLinkedFiles = value;
        await this.plugin.saveSettings();
      },
    });

    this.addDropdownSetting(containerEl, {
      name: "Review dialog",
      description: "Choose when to show the transfer review dialog.",
      options: [
        { value: "always", label: "Always" },
        { value: "linked-only", label: "Only when notes are linked" },
        { value: "never", label: "Never" },
      ],
      value: this.plugin.settings.reviewDialogMode,
      onChange: async (value) => {
        this.plugin.settings.reviewDialogMode = value;
        await this.plugin.saveSettings();
      },
    });

    this.addTextSetting(containerEl, {
      name: "Tags for copied notes",
      description: "Comma-separated tags added to transferred Markdown files when copying.",
      placeholder: "copied, sent",
      value: this.plugin.settings.tagsForCopiedElements,
      onChange: async (value) => {
        this.plugin.settings.tagsForCopiedElements = value;
        await this.plugin.saveSettings();
      },
    });

    this.addToggleSetting(containerEl, {
      name: "Also tag copied source notes",
      description: "Write the configured copy tags back into source Markdown files in the active vault.",
      value: this.plugin.settings.alsoTagCopiedSourceElements,
      onChange: async (value) => {
        this.plugin.settings.alsoTagCopiedSourceElements = value;
        await this.plugin.saveSettings();
      },
    });

    this.addTextSetting(containerEl, {
      name: "Tags for moved notes",
      description: "Comma-separated tags added to transferred Markdown files when moving.",
      placeholder: "moved, archived",
      value: this.plugin.settings.tagsForMovedElements,
      onChange: async (value) => {
        this.plugin.settings.tagsForMovedElements = value;
        await this.plugin.saveSettings();
      },
    });

    this.renderDestinationSettings(containerEl);
  }

  getSettingDefinitions() {
    return [
      {
        name: "Release notes",
        desc: "Read what changed in this version.",
        action: () => new ReleaseNotesModal(this.app).open(),
      },
      {
        name: "Conflict handling",
        desc: "Choose whether existing destination files are skipped, renamed automatically, or overwritten.",
        control: {
          type: "dropdown",
          key: "conflictStrategy",
          options: Object.fromEntries(
            (Object.entries(CONFLICT_STRATEGY_METADATA) as Array<[ConflictStrategy, typeof CONFLICT_STRATEGY_METADATA[ConflictStrategy]]>)
              .map(([value, meta]) => [value, meta.label]),
          ),
        },
      },
      {
        name: "Include linked files",
        desc: "Include directly related notes and linked non-Markdown files from selected notes.",
        control: { type: "toggle", key: "includeLinkedFiles" },
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
            never: "Never",
          },
        },
      },
      {
        name: "Tags for copied notes",
        desc: "Comma-separated tags added to transferred Markdown files when copying.",
        control: { type: "text", key: "tagsForCopiedElements", placeholder: "copied, sent" },
      },
      {
        name: "Also tag copied source notes",
        desc: "Write the configured copy tags back into source Markdown files in the active vault.",
        control: { type: "toggle", key: "alsoTagCopiedSourceElements" },
      },
      {
        name: "Tags for moved notes",
        desc: "Comma-separated tags added to transferred Markdown files when moving.",
        control: { type: "text", key: "tagsForMovedElements", placeholder: "moved, archived" },
      },
      {
        name: "Destination vaults",
        desc: "Configure local destination vaults for copied and moved content.",
        render: (setting: Setting) => {
          setting.controlEl.empty();
          this.renderDestinationSettings(setting.controlEl);
        },
      },
    ];
  }

  private renderDestinationSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Destination vaults").setHeading();
    containerEl.createEl("p", {
      text: "Use absolute paths. Destination and attachment paths must stay inside the destination vault root.",
    });

    for (const target of this.plugin.settings.targets) {
      this.renderDestinationCard(containerEl, target);
    }

    new Setting(containerEl)
      .setName("Add destination")
      .setDesc("Create another destination vault configuration.")
      .addButton((button) => {
        button.setButtonText("Add destination").setCta().onClick(async () => {
          this.plugin.settings.targets.push(createBlankDestination());
          await this.plugin.saveSettings();
          (this as unknown as { update: () => void }).update();
        });
      });
  }

  private renderDestinationCard(containerEl: HTMLElement, target: DestinationConfig): void {
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
      },
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
      },
    });

    this.addTextSetting(card, {
      name: "Destination path",
      description: "Absolute path inside the destination vault where copied and moved content will land.",
      placeholder: this.examplePath("Vault/Inbox"),
      value: target.destinationPath,
      onChange: async (value) => {
        target.destinationPath = value.trim();
        await this.saveAndRefreshValidation(validationHost, target);
      },
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
      },
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
        },
      });
    }

    this.renderValidation(validationHost, target);

    new Setting(card).addButton((button) => {
      button.setButtonText("Remove").setWarning().onClick(async () => {
        this.plugin.settings.targets = this.plugin.settings.targets.filter((entry) => entry.id !== target.id);
        await this.saveAndRefresh();
      });
    });
  }

  private addTextSetting(
    containerEl: HTMLElement,
    config: {
      name: string;
      description: string;
      placeholder: string;
      value: string;
      onChange: (value: string) => Promise<void>;
    },
  ): void {
    new Setting(containerEl)
      .setName(config.name)
      .setDesc(config.description)
      .addText((text) => {
        text.setPlaceholder(config.placeholder).setValue(config.value).onChange(config.onChange);
      });
  }

  private addToggleSetting(
    containerEl: HTMLElement,
    config: {
      name: string;
      description: string;
      value: boolean;
      onChange: (value: boolean) => Promise<void>;
    },
  ): void {
    new Setting(containerEl)
      .setName(config.name)
      .setDesc(config.description)
      .addToggle((toggle) => {
        toggle.setValue(config.value).onChange(config.onChange);
      });
  }

  private addDropdownSetting<T extends string>(
    containerEl: HTMLElement,
    config: {
      name: string;
      description: string;
      options: Array<{ value: T; label: string }>;
      value: T;
      onChange: (value: T) => Promise<void>;
    },
  ): void {
    new Setting(containerEl)
      .setName(config.name)
      .setDesc(config.description)
      .addDropdown((dropdown) => {
        for (const option of config.options) {
          dropdown.addOption(option.value, option.label);
        }
        dropdown.setValue(config.value).onChange((value) => config.onChange(value as T));
      });
  }

  private async saveAndRefresh(): Promise<void> {
    await this.plugin.saveSettings();
    (this as unknown as { update: () => void }).update();
  }

  private async saveAndRefreshValidation(containerEl: HTMLElement, target: DestinationConfig): Promise<void> {
    await this.plugin.saveSettings();
    this.renderValidation(containerEl, target);
  }

  private renderValidation(containerEl: HTMLElement, target: DestinationConfig): void {
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

  private async updateDetectedAttachmentPath(target: DestinationConfig): Promise<void> {
    const normalizedVaultPath = normalizeConfiguredPathInput(target.vaultPath);
    if (!path.isAbsolute(normalizedVaultPath)) {
      return;
    }
    target.attachmentPath = await this.destinationResolver.resolveDefaultAttachmentPath(normalizedVaultPath);
  }

  private examplePath(suffix: string): string {
    return process.platform === "win32" ? `C:\\${suffix.replace(/\//g, "\\")}` : `/Users/example/${suffix.replace(/\\/g, "/")}`;
  }
}

class ReleaseNotesModal extends Modal {
  private readonly renderer = new Component();

  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Release notes");
    this.contentEl.empty();
    void MarkdownRenderer.render(this.app, releaseNotes, this.contentEl, "RELEASENOTES.md", this.renderer);
  }

  onClose(): void {
    this.renderer.unload();
    this.contentEl.empty();
  }
}

export default class TransVaultPlugin extends Plugin {
  settings: TransVaultSettings = DEFAULT_SETTINGS;
  private readonly destinationResolver = new DestinationResolver(this.app.vault.configDir);
  private planner = new TransferPlanner(this, this.destinationResolver);
  private executor = new TransferExecutor(this);
  private notebookNavigatorMenusRegistered = false;
  private notebookNavigatorRetryIntervalId: number | null = null;

  async onload(): Promise<void> {
    if (!Platform.isDesktopApp) {
      new Notice("Trans Vault is available only on desktop.", 10000);
      return;
    }

    await this.loadSettings();
    this.addSettingTab(new TransVaultSettingTab(this.app, this, this.destinationResolver));
    this.registerCommands();
    this.registerContextMenus();
    this.registerNotebookNavigatorIntegration();
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as (Partial<TransVaultSettings> & { showReviewDialog?: boolean }) | null;
    const migratedReviewDialogMode: ReviewDialogMode | undefined = stored?.reviewDialogMode
      ?? (typeof stored?.showReviewDialog === "boolean"
        ? (stored.showReviewDialog ? "linked-only" : "never")
        : undefined);
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      reviewDialogMode: migratedReviewDialogMode ?? DEFAULT_SETTINGS.reviewDialogMode,
      targets: (stored?.targets ?? []).map((target) => {
        const migratedTarget = {
          ...createBlankDestination(),
          ...target,
          id: target.id ?? createDestinationId(),
        };
        if (typeof target.useDefaultAttachmentLocation !== "boolean" && !target.attachmentPath?.trim()) {
          migratedTarget.useDefaultAttachmentLocation = true;
        }
        return migratedTarget;
      }),
    };

    for (const target of this.settings.targets) {
      const normalizedVaultPath = normalizeConfiguredPathInput(target.vaultPath);
      if (target.useDefaultAttachmentLocation && path.isAbsolute(normalizedVaultPath)) {
        target.attachmentPath = await this.destinationResolver.resolveDefaultAttachmentPath(normalizedVaultPath);
      }
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private registerCommands(): void {
    this.addCommand({
      id: "copy-active-file-to-vault",
      name: TRANSFER_MODE_METADATA.copy.commandName,
      checkCallback: (checking) => this.handleActiveFileCommand("copy", checking),
    });
    this.addCommand({
      id: "move-active-file-to-vault",
      name: TRANSFER_MODE_METADATA.move.commandName,
      checkCallback: (checking) => this.handleActiveFileCommand("move", checking),
    });
  }

  private handleActiveFileCommand(mode: TransferMode, checking: boolean): boolean {
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

  private registerContextMenus(): void {
    this.registerEvent(this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
      this.addTransferMenuItems(menu, [file]);
    }));
    this.registerEvent(this.app.workspace.on("files-menu", (menu: Menu, files: TAbstractFile[]) => {
      this.addTransferMenuItems(menu, files);
    }));
  }

  private registerNotebookNavigatorIntegration(): void {
    this.tryRegisterNotebookNavigatorMenus();
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.tryRegisterNotebookNavigatorMenus();
    }));

    if (!this.notebookNavigatorMenusRegistered) {
      this.notebookNavigatorRetryIntervalId = window.setInterval(() => {
        this.tryRegisterNotebookNavigatorMenus();
      }, 2000);
      this.registerInterval(this.notebookNavigatorRetryIntervalId);
    }
  }

  private tryRegisterNotebookNavigatorMenus(): void {
    if (this.notebookNavigatorMenusRegistered) {
      return;
    }
    const notebookNavigator = ((this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins?.["notebook-navigator"] as {
      api?: {
        menus?: {
          registerFileMenu?: (callback: (context: unknown) => void) => (() => void) | void;
          registerFolderMenu?: (callback: (context: unknown) => void) => (() => void) | void;
        };
      };
    } | undefined)?.api;

    if (!notebookNavigator?.menus) {
      return;
    }

    const disposeFileMenu = notebookNavigator.menus.registerFileMenu?.((context) => {
      const menuContext = getExternalMenuContext(context);
      if (!menuContext || !menuContext.addItem) {
        return;
      }
      const selection = Array.isArray(menuContext.selection?.files)
        ? menuContext.selection.files.filter(isAbstractFile)
        : isAbstractFile(menuContext.file) ? [menuContext.file] : [];
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

  private addTransferMenuItems(menu: Menu, selection: TAbstractFile[]): void {
    const normalizedSelection = this.planner.normalizeSelection(selection);
    if (normalizedSelection.length === 0) {
      return;
    }
    this.addModeMenuItem(menu, normalizedSelection, "copy");
    this.addModeMenuItem(menu, normalizedSelection, "move");
  }

  private addTransferMenuItemsToExternalMenu(addItem: Menu["addItem"], selection: TAbstractFile[]): void {
    const normalizedSelection = this.planner.normalizeSelection(selection);
    if (normalizedSelection.length === 0) {
      return;
    }
    this.addModeMenuItemToExternalMenu(addItem, normalizedSelection, "copy");
    this.addModeMenuItemToExternalMenu(addItem, normalizedSelection, "move");
  }

  private addModeMenuItem(menu: Menu, selection: TAbstractFile[], mode: TransferMode): void {
    menu.addItem((item) => {
      this.configureTransferMenuItem(item, selection, mode);
    });
  }

  private addModeMenuItemToExternalMenu(addItem: Menu["addItem"], selection: TAbstractFile[], mode: TransferMode): void {
    addItem((item) => {
      this.configureTransferMenuItem(item, selection, mode);
    });
  }

  private configureTransferMenuItem(item: MenuItem, selection: TAbstractFile[], mode: TransferMode): void {
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

  private openTargetModal(mode: TransferMode, selection: TAbstractFile[]): void {
    const targets = this.getSelectableTargets();
    if (targets.length === 0) {
      new Notice("Add a destination vault first.", 8000);
      return;
    }
    const title = TRANSFER_MODE_METADATA[mode].targetModalTitle;
    new TargetVaultSuggestModal(this.app, targets, title, (target) => {
      void this.runTransfer(mode, selection, target);
    }).open();
  }

  private getSelectableTargets(): DestinationConfig[] {
    return this.settings.targets.filter((target) => target.name.trim().length > 0);
  }

  private async runTransfer(mode: TransferMode, selection: TAbstractFile[], target: DestinationConfig): Promise<void> {
    try {
      const plan = await this.planner.prepare(selection, target);
      const confirmedSelectionPaths = await this.maybeReviewPlan(plan);
      if (confirmedSelectionPaths === null) {
        return;
      }

      const summary = await this.executor.execute(plan, mode, confirmedSelectionPaths);
      this.showTransferSummaryNotice(mode, summary);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "Couldn't complete the transfer.", 12000);
    }
  }

  private async maybeReviewPlan(plan: PreparedTransferPlan): Promise<string[] | null | undefined> {
    const hasReviewableSelection = plan.explicitMarkdownPaths.length > 0;
    const hasRelevantRelationships = plan.reviewRoots.some((root) => root.children.length > 0);
    if (!hasReviewableSelection || this.settings.reviewDialogMode === "never") {
      return undefined;
    }
    if (this.settings.reviewDialogMode === "linked-only" && !hasRelevantRelationships) {
      return undefined;
    }
    const result = await new ReviewSelectionModal(this.app, plan.reviewRoots, this.settings.conflictStrategy).waitForResult();
    if (!result.confirmed) {
      return null;
    }
    return result.selectedPaths;
  }

  private showTransferSummaryNotice(mode: TransferMode, summary: TransferSummary): void {
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
      const notice = new Notice(fragment, 0);
      notice.messageEl.addClass("transvault-notice-clickable");
      notice.messageEl.addEventListener("click", () => {
        notice.hide();
      });
      return;
    }

    new Notice(`${action}: ${parts.join(", ")}.`, 10000);
  }
}