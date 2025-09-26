# Steps to deploy
## Preparation
1. Increase the `serverVersion` in [src/index.ts](src/index.ts).
2. Commit & Push
## Publish
Use the **same version** for the git tag as in [src/index.ts](src/index.ts).
- Via git tag
    1. Create a new version tag.
       ```bash
       git tag v[MAJOR].[MINOR].[PATCH]
       ```
       > Example: `git tag v2.5.5`
    2. Push the tag.
       ```bash
       git push origin --tags
       ```
- Via Github release 

  Create a new [Github release](https://github.com/configcat/mcp-server/releases) with a new version tag and release notes.
