import { GlobalConfig } from '@n8n/config';
import { Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash/get';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	@Post('/')
	async getNodeInfo(req: Request) {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

		const defaultLocale = this.globalConfig.defaultLocale;

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<Array<INodeTypeDescription & { metadata?: { tags?: string[] } }>>(
				(acc, { name, version }) => {
					const nodeType = this.nodeTypes.getByNameAndVersion(name, version);
					const { description } = nodeType;
					// Get the original node class instance to access metadata
					// Metadata might not be preserved in the versioned node type description
					let metadata: { tags?: string[] } | undefined;
					try {
						// Try to get metadata from the original node class instance
						const originalNode = this.loadNodesAndCredentials.getNode(name);
						// The node class instance has a description property with metadata
						const nodeClassInstance = originalNode?.type;
						if (nodeClassInstance && 'description' in nodeClassInstance) {
							const originalDescription = nodeClassInstance.description as {
								metadata?: { tags?: string[] };
							};
							metadata = originalDescription.metadata;
							// Debug logging (remove in production)
							if (name === 'n8n-nodes-base.alpacaMarkets') {
								console.log('[Metadata Debug]', {
									hasOriginalNode: !!originalNode,
									hasNodeClassInstance: !!nodeClassInstance,
									hasDescription: 'description' in nodeClassInstance,
									originalDescriptionKeys: originalDescription
										? Object.keys(originalDescription)
										: [],
									metadata,
								});
							}
						}
					} catch (error) {
						// If we can't access the original node, fall back to checking the description
						if (name === 'n8n-nodes-base.alpacaMarkets') {
							console.error('[Metadata Debug] Error accessing original node:', error);
						}
					}
					// Fall back to checking the description if we didn't get metadata from the original node
					metadata ??= (description as { metadata?: { tags?: string[] } }).metadata;
					const descriptionWithMetadata = {
						...description,
						...(metadata && { metadata }),
					};
					acc.push(
						descriptionWithMetadata as INodeTypeDescription & { metadata?: { tags?: string[] } },
					);
					return acc;
				},
				[],
			);
		}

		const populateTranslation = async (
			name: string,
			version: number,
			nodeTypes: Array<INodeTypeDescription & { metadata?: { tags?: string[] } }>,
		) => {
			const { description, sourcePath } = this.nodeTypes.getWithSourcePath(name, version);
			const translationPath = await this.nodeTypes.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				description.translation = JSON.parse(translation);
			} catch {
				// ignore - no translation exists at path
			}

			// Get the original node class instance to access metadata
			// Metadata might not be preserved in the versioned node type description
			let metadata: { tags?: string[] } | undefined;
			try {
				// Try to get metadata from the original node class instance
				const originalNode = this.loadNodesAndCredentials.getNode(name);
				// The node class instance has a description property with metadata
				const nodeClassInstance = originalNode?.type;
				if (nodeClassInstance && 'description' in nodeClassInstance) {
					const originalDescription = nodeClassInstance.description as {
						metadata?: { tags?: string[] };
					};
					metadata = originalDescription.metadata;
				}
			} catch (error) {
				// If we can't access the original node, fall back to checking the description
				console.error('Error accessing original node for metadata:', error);
			}
			// Fall back to checking the description if we didn't get metadata from the original node
			metadata ??= (description as { metadata?: { tags?: string[] } }).metadata;
			const descriptionWithMetadata = {
				...description,
				...(metadata && { metadata }),
			};
			nodeTypes.push(
				descriptionWithMetadata as INodeTypeDescription & { metadata?: { tags?: string[] } },
			);
		};

		const nodeTypes: Array<INodeTypeDescription & { metadata?: { tags?: string[] } }> = [];

		const promises = nodeInfos.map(
			async ({ name, version }) => await populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}
}
