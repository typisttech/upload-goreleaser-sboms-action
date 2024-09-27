<div align="center">

# Upload GoReleaser SBOMs

</div>

<div align="center">

[![Check Transpiled JavaScript](https://github.com/typisttech/upload-goreleaser-sboms-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/typisttech/upload-goreleaser-sboms-action/actions/workflows/check-dist.yml)
[![GitHub Release](https://img.shields.io/github/v/release/typisttech/upload-goreleaser-sboms-action?style=flat-square&)](https://github.com/typisttech/upload-goreleaser-sboms-action/releases/latest)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-upload--goreleaser--sbom-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/upload-goreleaser-sboms)
[![license](https://img.shields.io/github/license/typisttech/upload-goreleaser-sboms-action.svg?style=flat-square)](https://github.com/typisttech/upload-goreleaser-sboms-action/blob/master/LICENSE)
[![X Follow @TangRufus](https://img.shields.io/badge/Follow-%40TangRufus-black?style=flat-square&logo=x&logoColor=white)](https://x.com/tangrufus)
[![Hire Typist Tech](https://img.shields.io/badge/Hire-Typist%20Tech-ff69b4.svg?style=flat-square)](https://typist.tech/contact/)

</div>

<p align="center">
  <strong>Upload GoReleaser-generated SBOMs as an artifact.</strong>
  <br />
  <br />
  Built with ♥ by <a href="https://typist.tech/">Typist Tech</a>
</p>

---

## Usage

### Inputs

```yaml
- uses: typisttech/upload-goreleaser-sboms-action@v0
  with:
    # Name of the artifact to upload.
    # Required. Default is 'sboms'
    name:
    # Path to the dist folder which containing artifacts.json
    # Required. Default is 'dist'
    dist:
    # The SBOM suffix.
    #
    # This action expects the SBOM is named after its subject with a suffix under the same directory.
    # 
    # See [Known Issues](https://github.com/typisttech/upload-goreleaser-sboms-action?tab=readme-ov-file#known-issues)
    # 
    # Required. Default is '.sbom.json'
    sbom-suffix:

    # Duration after which artifact will expire in days. 0 means using default retention.
    # Minimum 1 day.
    # Maximum 90 days unless changed from the repository settings page.
    # Required. Defaults to repository settings.
    retention-days:

    # The level of compression for Zlib to be applied to the artifact archive.
    # The value can range from 0 to 9.
    # For large files that are not easily compressed, a value of 0 is recommended for significantly faster uploads.
    # Required. Default is '6'
    compression-level:
```

### Outputs

| Name | Description | Example |
| - | - | - |
| `attestations` | Array of **subject** and **sbom** paris. | `[{"subject":"dist/foo","sbom":"dist/foo.sbom.json"},{"subject":"dist/bar","sbom":"dist/bar.sbom.json"}]` |
| `artifact-id` | GitHub ID of an Artifact. This ID can be used as input to other APIs to download, delete or get more information about an artifact: [https://docs.github.com/en/rest/actions/artifacts](https://docs.github.com/en/rest/actions/artifacts) | `1234` |

## Examples

### Basic

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    outputs:
      sbom-artifact-id: ${{ steps.upload-sbom.outputs.artifact-id }}
      sbom-attestations: ${{ steps.upload-sbom.outputs.attestations }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
      - uses: anchore/sbom-action/download-syft@v0
      - uses: goreleaser/goreleaser-action@v6
        with:
          version: '~> v2'
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: typisttech/upload-goreleaser-sboms-action@v0
        id: upload-sbom

  attest-sbom:
    needs: [release]
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      attestations: write
    strategy:
      matrix:
        attestation: ${{ fromJSON(needs.release.outputs.sbom-attestations) }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: 'sboms'
      - uses: actions/attest-sbom@v1
        with:
          subject-path: ${{ matrix.attestation.subject }}
          sbom-path: ${{ matrix.attestation.sbom }}
```

### Attest Build Provenance and SBOMs & Verify & Cleanup

```yaml
on:
  push:
    tags:
      - '*'

permissions: {}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    outputs:
      build-provenance-artifact-id: ${{ steps.upload-build-provenance.outputs.artifact-id }}
      sbom-artifact-id: ${{ steps.upload-sbom.outputs.artifact-id }}
      sbom-attestations: ${{ steps.upload-sbom.outputs.attestations }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'
      - uses: anchore/sbom-action/download-syft@v0
      - uses: goreleaser/goreleaser-action@v6
        with:
          version: '~> v2'
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v4
        id: upload-build-provenance
        with:
          name: build-provenance
          path: |
            dist/my-cmd_*/my-cmd
            dist/my-cmd_*.tar.gz
            dist/**/*.sbom.json
      - uses: typisttech/upload-goreleaser-sboms-action@v0
        id: upload-sbom
        with:
          name: sbom-artifact

  attest-build-provenance:
    needs: [release]
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      attestations: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: dist
          name: build-provenance
      - uses: actions/attest-build-provenance@v1
        with:
          subject-path: |
            dist/my-cmd_*/my-cmd
            dist/my-cmd_*.tar.gz
            dist/**/*.sbom.json

  attest-sbom:
    needs: [release]
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      attestations: write
    strategy:
      matrix:
        attestation: ${{ fromJSON(needs.release.outputs.sbom-attestations) }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: sbom-artifact
      - uses: actions/attest-sbom@v1
        with:
          subject-path: ${{ matrix.attestation.subject }}
          sbom-path: ${{ matrix.attestation.sbom }}

  verify:
    needs: [release, attest-build-provenance, attest-sbom]
    runs-on: ubuntu-latest
    steps:
      - run: gh release download --clobber --dir artifacts --repo $REPO $TAG
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}
          TAG: ${{ github.ref_name }}
      - run: tree artifacts
      - run: ls | xargs -I {} gh attestation verify --repo $REPO {}
        working-directory: artifacts
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}

  cleanup:
    needs: [release, verify]
    runs-on: ubuntu-latest
    permissions:
      actions: write
    steps:
      - run: >
          gh api --method DELETE -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/$REPO/actions/artifacts/$ARTIFACT_ID
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}
          ARTIFACT_ID: ${{ needs.release.outputs.build-provenance-artifact-id }}
      - run: >
          gh api --method DELETE -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/$REPO/actions/artifacts/$ARTIFACT_ID
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}
          ARTIFACT_ID: ${{ needs.release.outputs.sbom-artifact-id }}
```

## Known Issues

### SBOM Suffix

This action expects the SBOM is named after its subject with a suffix under the same directory.

For example:

```console
$ tree dist
dist
├── artifacts.json
├── my-cmd_1.2.3_darwin_amd64.tar.gz
├── my-cmd_1.2.3_darwin_amd64.tar.gz.sbom.json
├── my-cmd_1.2.3_linux_arm64.tar.gz
└── my-cmd_1.2.3_linux_arm64.tar.gz.sbom.json
```

## Credits

[Upload GoReleaser SBOMs](https://github.com/typisttech/upload-goreleaser-sboms-action) is a [Typist Tech](https://typist.tech) project and maintained by [Tang Rufus](https://x.com/TangRufus), freelance developer for [hire](https://typist.tech/contact/).

Full list of contributors can be found [here](https://github.com/typisttech/upload-goreleaser-sboms-action/graphs/contributors).

## Copyright and License

This project is a [free software](https://www.gnu.org/philosophy/free-sw.en.html) distributed under the terms of the MIT license. For the full license, see [LICENSE](./LICENSE).

## Contribute

Feedbacks / bug reports / pull requests are welcome.
