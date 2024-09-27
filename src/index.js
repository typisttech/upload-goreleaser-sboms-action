import { readFileSync } from 'fs';
import { exit } from 'process';
import { debug, getInput, setOutput, setFailed } from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';

function getIntInput(key) {
  const inputStr = getInput(key)
  if (!inputStr) {
    setFailed(`Invalid ${key}: Blank value`)
    exit()
  }
  const inputInt = parseInt(inputStr)
  if (isNaN(inputInt)) {
    setFailed(`Invalid ${key}: Not a number`)
    exit()
  }
  return inputInt
}

async function run() {
  try {
    const name = getInput('name');
    debug(`Name: ${name}`);
    const dist = getInput('dist');
    debug(`Dist: ${dist}`);
    const sbomSuffix = getInput('sbom-suffix');
    debug(`SBOM Suffix: ${sbomSuffix}`);
    const retentionDays = getIntInput('retention-days');
    debug(`Retention Days: ${retentionDays}`);
    const compressionLevel = getIntInput('compression-level');
    debug(`Compression Level: ${compressionLevel}`);

    debug(`Parsing ${dist}/artifacts.json`)
    const artifacts = JSON.parse(
      readFileSync(`${dist}/artifacts.json`)
    )

    const sboms = artifacts.filter((artifact) => artifact.type === 'SBOM');
    if (sboms.length === 0) {
      setFailed('No SBOMs found');
    }

    const attestations = sboms.reduce((acc, sbom) => {
      acc.push({
        subject: sbom.path.slice(0, -sbomSuffix.length),
        sbom: sbom.path,
      });
      return acc;
    }, []);
    setOutput('attestations', attestations);

    const uploadPaths = attestations.reduce((acc, current) => {
      acc.push(current.subject);
      acc.push(current.sbom);
      return acc;
    }, []);

    const artifactClient = new DefaultArtifactClient()
    const {id: artifactId} = await artifactClient.uploadArtifact(name, uploadPaths, '.', {
      retentionDays,
      compressionLevel,
    });
    setOutput('artifact-id', artifactId);
  } catch (error) {
    setFailed(error.message);
  }
}

run();
