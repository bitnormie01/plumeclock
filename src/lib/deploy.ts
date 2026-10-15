import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Chain, Hex, PublicClient, Transport } from 'viem';
import { mitigationFundAbi, plumeClockAbi } from './abi.generated';
import type { ActorWallets } from './actors';
import { networkConfig } from './chain';
import type { DeploymentFile, NetworkName } from './types';

export const ARTIFACTS_DIR = 'contracts/out';
export const DEPLOYMENTS_DIR = 'public/deployments';

export function readBytecode(contract: 'PlumeClock' | 'MitigationFund', artifactsDir = ARTIFACTS_DIR): Hex {
  const path = join(artifactsDir, `${contract}.sol`, `${contract}.json`);
  const artifact = JSON.parse(readFileSync(path, 'utf8')) as { bytecode?: { object?: string } };
  const object = artifact.bytecode?.object;
  if (!object || !object.startsWith('0x') || object.length < 4) throw new Error(`No bytecode in ${path} (run forge build)`);
  return object as Hex;
}

export interface DeployOptions {
  network: NetworkName;
  rpcUrl: string;
  publicClient: PublicClient<Transport, Chain>;
  actors: ActorWallets;
  responseWindowSeconds: number;
  minBondWei: bigint;
  artifactsDir?: string;
}

/** Deploys MitigationFund (steward = deployer) then PlumeClock (arbiter = deployer). */
export async function deployPlumeClock(opts: DeployOptions): Promise<DeploymentFile> {
  const { publicClient, actors } = opts;
  const deployer = actors.deployer.account.address;
  const fundHash = await actors.deployer.deployContract({
    abi: mitigationFundAbi,
    bytecode: readBytecode('MitigationFund', opts.artifactsDir),
    args: [deployer],
  });
  const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundHash });
  if (!fundReceipt.contractAddress) throw new Error('MitigationFund deployment returned no address');
  const clockHash = await actors.deployer.deployContract({
    abi: plumeClockAbi,
    bytecode: readBytecode('PlumeClock', opts.artifactsDir),
    args: [
      actors.feeder.account.address,
      deployer,
      fundReceipt.contractAddress,
      BigInt(opts.responseWindowSeconds),
      opts.minBondWei,
    ],
  });
  const clockReceipt = await publicClient.waitForTransactionReceipt({ hash: clockHash });
  if (!clockReceipt.contractAddress) throw new Error('PlumeClock deployment returned no address');
  const cfg = networkConfig(opts.network);
  return {
    schema: 'plumeclock.deployment.v1',
    network: opts.network,
    chainId: cfg.chain.id,
    rpcUrl: opts.network === 'anvil' ? opts.rpcUrl : cfg.rpcUrl,
    explorerUrl: cfg.explorerUrl,
    plumeClock: clockReceipt.contractAddress,
    mitigationFund: fundReceipt.contractAddress,
    deployBlock: Number(fundReceipt.blockNumber),
    responseWindowSeconds: opts.responseWindowSeconds,
    minBondWei: opts.minBondWei.toString(),
    actors: {
      deployer,
      feeder: actors.feeder.account.address,
      arbiter: deployer,
      operatorA: actors.operatorA.account.address,
      operatorB: actors.operatorB.account.address,
    },
    deployedAt: new Date().toISOString(),
  };
}

export function deploymentPath(network: NetworkName, dir = DEPLOYMENTS_DIR): string {
  return join(dir, `${network}.json`);
}

export function writeDeployment(file: DeploymentFile, dir = DEPLOYMENTS_DIR): string {
  mkdirSync(dir, { recursive: true });
  const path = deploymentPath(file.network, dir);
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
  return path;
}

export function readDeployment(network: NetworkName, dir = DEPLOYMENTS_DIR): DeploymentFile {
  return JSON.parse(readFileSync(deploymentPath(network, dir), 'utf8')) as DeploymentFile;
}
