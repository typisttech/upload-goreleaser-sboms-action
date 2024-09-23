import { readFileSync } from 'fs';
import { getInput, setOutput, setFailed } from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';

async function run() {
  try {
    const dist = getInput('dist');
    const sbomSuffix = getInput('sbom-suffix');
    const artifactName = getInput('artifact');
    const retentionDays = getInput('retention-days');
    const compressionLevel = getInput('compression-level');

    const artifacts = JSON.parse(
      readFileSync(`${dist}/artifacts.json`)
    )

    const sboms = artifacts.filter((artifact) => artifact.type === 'SBOM');

    const attestations = sboms.reduce((acc, sbom) => {
      acc.push({
        subject: sbom.path.slice(0, -sbomSuffix.length),
        sbom: sbom.path,
      });
      return acc;
    }, []);
    setOutput("attestations", attestations);

    const uploadPaths = attestations.reduce((acc, current) => {
      acc.push(current.subject);
      acc.push(current.sbom);
      return acc;
    }, []);

    const artifactClient = new DefaultArtifactClient()
    const {id: artifactId} = await artifactClient.uploadArtifact(artifactName, uploadPaths, '.', {
      retentionDays,
      compressionLevel,
    });
    setOutput("artifact-id", artifactId);
  } catch (error) {
    setFailed(error.message);
  }
}

run();
