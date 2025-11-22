import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { constants, createPrivateKey, createSign } from 'node:crypto';

import { formatPrivateKey } from '../utils/utilities';

export class KalshiApi implements ICredentialType {
	name = 'kalshiApi';

	displayName = 'Kalshi API';

	documentationUrl = 'kalshi';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Paper Trading (Sandbox)',
					value: 'paper',
				},
				{
					name: 'Live Trading',
					value: 'live',
				},
			],
			default: 'paper',
			description: 'Choose whether to use paper trading (sandbox) or live trading environment',
		},
		{
			displayName: 'API Key ID',
			name: 'apiKeyId',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Kalshi API Key ID',
		},
		{
			displayName: 'Private Key (RSA)',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
				rows: 4,
			},
			default: '',
			required: true,
			description:
				'Your Kalshi RSA private key in PEM format. Kalshi generates keys in RSA_PRIVATE_KEY format (-----BEGIN RSA PRIVATE KEY-----). Paste the entire key including the BEGIN and END lines. This is shown only once when you create the API key.',
		},
	];

	// eslint-disable-next-line @typescript-eslint/require-await
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const apiKeyId = credentials.apiKeyId as string;
		let privateKey = (credentials.privateKey as string) || '';

		// Normalize the private key: handle escaped newlines and ensure proper format
		privateKey = privateKey
			.replace(/\\n/g, '\n') // Replace escaped newlines
			.replace(/\r\n/g, '\n') // Normalize Windows line endings
			.replace(/\r/g, '\n') // Normalize Mac line endings
			.trim();

		// Ensure the key has proper PEM headers
		if (!privateKey.includes('BEGIN')) {
			throw new Error(
				'Invalid private key format. Please ensure the key includes -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY----- and corresponding END lines.',
			);
		}

		// Format the private key using n8n's utility function
		// This handles various key format issues
		privateKey = formatPrivateKey(privateKey);

		// Validate and load the private key first
		// Try with explicit format specification
		let keyObject: ReturnType<typeof createPrivateKey>;
		try {
			// Try to create the key with explicit format
			// Node.js createPrivateKey supports both PKCS#1 and PKCS#8 formats
			keyObject = createPrivateKey({
				key: privateKey,
				format: 'pem',
			});
		} catch (keyError) {
			const keyErrorMessage =
				keyError instanceof Error ? keyError.message : 'Unknown error parsing private key';

			// Detect key format
			const isPkcs1 = privateKey.includes('BEGIN RSA PRIVATE KEY');
			const isPkcs8 = privateKey.includes('BEGIN PRIVATE KEY');
			const keyFormat = isPkcs1 ? 'PKCS#1' : isPkcs8 ? 'PKCS#8' : 'Unknown';

			// Check for common issues
			const hasNewlines = privateKey.includes('\n');
			const hasBeginEnd = privateKey.includes('BEGIN') && privateKey.includes('END');
			const keyLength = privateKey.length;

			let diagnosticInfo = '\nKey diagnostics:\n';
			diagnosticInfo += `- Format detected: ${keyFormat}\n`;
			diagnosticInfo += `- Has newlines: ${hasNewlines}\n`;
			diagnosticInfo += `- Has BEGIN/END markers: ${hasBeginEnd}\n`;
			diagnosticInfo += `- Key length: ${keyLength} characters\n`;

			// If PKCS#1 format, provide conversion instructions
			const conversionHint = isPkcs1
				? '\n\nYour key appears to be in PKCS#1 format (-----BEGIN RSA PRIVATE KEY-----).\n' +
					'While Node.js should support this, you may need to convert it to PKCS#8 format.\n' +
					'You can convert it using OpenSSL:\n' +
					'openssl pkcs8 -topk8 -inform PEM -outform PEM -in your_key.pem -out key_pkcs8.pem -nocrypt\n' +
					'Then use the converted key (with -----BEGIN PRIVATE KEY----- header).'
				: '';

			throw new Error(
				'Invalid private key format. The key could not be parsed.\n\n' +
					'Please ensure:\n' +
					'1. The key is in PEM format (PKCS#8 with -----BEGIN PRIVATE KEY----- is preferred)\n' +
					'2. The key is unencrypted (no passphrase)\n' +
					'3. All newlines are preserved (the key should have actual line breaks, not \\n)\n' +
					'4. The key includes both BEGIN and END markers\n\n' +
					`Error: ${keyErrorMessage}${diagnosticInfo}${conversionHint}`,
			);
		}

		// Generate timestamp in milliseconds
		const timestamp = Date.now().toString();

		// Extract method and path from request options
		const method = (requestOptions.method ?? 'GET').toUpperCase();
		const url = new URL(requestOptions.url ?? '', requestOptions.baseURL ?? '');
		// Important: Strip query parameters from path before signing (per Kalshi docs)
		const path = url.pathname;

		// Create message to sign: timestamp + method + path (without query params)
		const message = timestamp + method + path;

		// Sign the message using RSA-PSS with SHA-256
		// Kalshi requires: PSS padding with MGF1-SHA256 and salt length = digest length
		// Per Kalshi docs: use RSA_PKCS1_PSS_PADDING (not RSA_PSS_PADDING)
		const sign = createSign('RSA-SHA256');
		sign.update(message, 'utf8');
		sign.end();

		let signature: string;
		try {
			// Use RSA_PKCS1_PSS_PADDING as per Kalshi JavaScript example
			// saltLength: RSA_PSS_SALTLEN_DIGEST (equals digest length = 32 bytes for SHA-256)
			signature = sign.sign(
				{
					key: keyObject,
					padding: constants.RSA_PKCS1_PSS_PADDING,
					saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
				},
				'base64',
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error occurred while signing request';
			throw new Error(`Failed to sign Kalshi API request. Error: ${errorMessage}`);
		}

		// Add authentication headers
		const headers = {
			...requestOptions.headers,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'KALSHI-ACCESS-KEY': apiKeyId,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'KALSHI-ACCESS-TIMESTAMP': timestamp,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'KALSHI-ACCESS-SIGNATURE': signature,
		};

		return {
			...requestOptions,
			headers,
		};
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "paper" ? "https://demo-api.kalshi.co" : "https://api.kalshi.com"}}',
			url: '/trade-api/v2/portfolio/balance',
			method: 'GET',
		},
	};
}
