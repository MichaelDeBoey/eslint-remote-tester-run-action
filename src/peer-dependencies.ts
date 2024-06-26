import path from 'node:path';
import semverCompare from 'semver/functions/compare';
import * as core from '@actions/core';
import * as exportsForCompareAction from 'eslint-remote-tester/dist/exports-for-compare-action';
import { readFileSync } from 'node:fs';

// All available peer dependencies
type PeerDependency = 'eslint-remote-tester' | never;

// prettier-ignore
type PeerDependencyType<T = PeerDependency> =
    T extends 'eslint-remote-tester' ? typeof exportsForCompareAction :
    never;

interface DependencyInfo {
    exportPath: string;
    minVersion: string;
    packageJsonPath: string;
    bin?: string;
}

// Changes to minVersion's require major release
const DEPENDENCY_TO_INFO: Record<PeerDependency, DependencyInfo> = {
    'eslint-remote-tester': {
        minVersion: '4.0.0',
        exportPath: 'eslint-remote-tester/dist/exports-for-compare-action.js',
        packageJsonPath: 'eslint-remote-tester/package.json',
        bin: 'eslint-remote-tester',
    },
};

// Expected to be found from consuming project's dependencies
const PATH_PREFIX = './node_modules/';

export const ESLINT_REMOTE_TESTER_BIN =
    PATH_PREFIX + '.bin/' + DEPENDENCY_TO_INFO['eslint-remote-tester'].bin;

/**
 * Require peer dependency from consuming projects
 */
export async function importPeerDependency<
    T extends PeerDependency = PeerDependency,
>(dependency: T): Promise<PeerDependencyType<T>> {
    const { minVersion, exportPath, packageJsonPath } =
        DEPENDENCY_TO_INFO[dependency];

    let packageJson;
    try {
        packageJson = JSON.parse(
            readFileSync(path.resolve(PATH_PREFIX + packageJsonPath), 'utf8')
        );
    } catch (error) {
        core.error(`Unable to read ${packageJsonPath}`);
        throw error;
    }

    if (semverCompare(packageJson.version, minVersion) === -1) {
        throw new Error(
            `Peer dependency ${dependency} must be ${minVersion} or above. Found version ${packageJson.version}.`
        );
    }

    try {
        return await import(path.resolve(PATH_PREFIX + exportPath));
    } catch (e) {
        core.error(`Unable to require peerDependency ${dependency}`);
        core.error(e);
        throw e;
    }
}
