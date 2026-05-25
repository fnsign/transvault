# Manual Test Plan

Use two local desktop vaults:

- Source vault: the vault where Trans Vault is installed and enabled.
- Destination vault: a separate local Obsidian vault with its own `.obsidian/app.json`.

## Recommended Source Fixture

- `Projects/Alpha.md` linking to `[[Beta]]` and embedding `![[diagram.png]]`
- `Projects/Beta.md` linking back to `[[Alpha]]`
- `Projects/Loose.md` with no direct note relationships
- `Projects/TaggedArray.md` with `tags` stored as a YAML array
- `Projects/TaggedComma.md` with `tags` stored as a comma-separated YAML string
- `Projects/TaggedSpace.md` with `tags` stored as a whitespace-separated YAML string
- `Projects/BrokenFrontmatter.md` with intentionally invalid YAML frontmatter
- `Projects/diagram.png`
- `Projects/Nested/Gamma.md`
- `Archive/Existing.md` already copied once into the destination to force a conflict

## Recommended Destination Settings

- Destination vault path: absolute path to the destination vault root
- Destination path: absolute path inside the destination vault, for example `.../Inbox/Transfers`
- Use destination default attachment location: test once enabled and once disabled
- Attachment path when manual: absolute path inside the destination vault, for example `.../Assets/Imported`

## Validation Checklist

0. Add a new destination configuration.
Expected: `Use default attachment location` starts disabled and the manual attachment path field is visible.

1. Copy a single active markdown file from the command palette.
Expected: the destination file is written into the destination path and the source file remains in place.

2. Copy a standalone markdown file with no direct links.
Expected: no review dialog appears when the file has no direct `links to` or `links from` relationships.

3. Copy `Alpha.md` with review enabled.
Expected: the review dialog appears, shows one root for `Alpha`, a `links to` group containing `Beta`, and a `links from` group containing `Beta`.

4. In the review dialog, uncheck the `links from` instance of `Beta` but keep the `links to` instance checked.
Expected: the UI shows independent checkbox state per visible instance and the final markdown selection still includes `Beta` through the remaining checked instance.

5. Uncheck an entire group node in the review dialog.
Expected: all note nodes in that group are unchecked and the parent note shows a visible `-` mixed state when another branch remains selected.

6. Copy `Alpha.md` with `Include linked files` enabled.
Expected: `diagram.png` is transferred into the resolved attachment path and markdown links in transferred markdown files are rewritten only when the referenced target is also transferred.

7. Copy a folder such as `Projects` from the file explorer.
Expected: the destination keeps the internal folder structure below the destination path, including `Projects/Nested/Gamma.md`.

8. Copy multiple standalone files from the file explorer.
Expected: the selected files land flat in the destination path instead of recreating their source parent folders.

9. Test conflict handling with `skip`.
Expected: existing destination files are skipped, a persistent warning notice appears, up to 10 skipped items are listed directly, and longer lists end with `... and N more skipped elements.`.

10. Test conflict handling with `auto-rename`.
Expected: conflicting files are written as `Name 1.ext`, `Name 2.ext`, and so on.

11. Test conflict handling with `overwrite`.
Expected: the existing destination file is replaced.

12. Test copy tagging.
Expected: configured copy tags are written into destination markdown frontmatter, duplicates are avoided, and enabling `Also tag copied source elements` also updates the source markdown file.

13. Test source tagging while the source note is open in the editor.
Expected: with `Also tag copied source elements` enabled, copying an open markdown note updates its source frontmatter successfully and the merged tags are visible after the transfer.

14. Test source tag format preservation.
Expected: when copying `TaggedArray.md`, `TaggedComma.md`, and `TaggedSpace.md` with `Also tag copied source elements` enabled, existing source tag formats stay array, comma-separated string, and whitespace-separated string respectively while still merging new tags without duplicates.

15. Test move tagging.
Expected: configured move tags are written into destination markdown frontmatter before the source markdown file is deleted.

16. Test invalid frontmatter handling.
Expected: transfer still succeeds, tagging is skipped for the broken markdown file, and a warning is recorded instead of aborting the operation.

17. Test invalid source frontmatter handling with source tagging enabled.
Expected: copying `BrokenFrontmatter.md` with `Also tag copied source elements` enabled does not abort the transfer, does not corrupt the source file, and records a warning for the skipped source-tag update.

18. Test move from the file explorer on a folder and on a single markdown file.
Expected: source files are deleted only after successful destination writes, and emptied source folders are removed when possible.

19. Test destination default attachment detection.
Expected: when the destination vault has a readable `attachmentFolderPath`, linked non-markdown files are placed there; when it is missing or unreadable, the destination vault root is used.

20. Test legacy destination settings without `useDefaultAttachmentLocation`.
Expected: existing manual attachment paths remain manual, and old destinations without an attachment path continue to use destination default attachment detection.