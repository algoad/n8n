import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AlpacaMarketsApi implements ICredentialType {
	name = 'alpacaMarketsApi';

	displayName = 'Alpaca Markets API';

	documentationUrl = 'alpaca';

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
			description: 'Your Alpaca API Key ID',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Alpaca Secret Key',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'APCA-API-KEY-ID': '={{$credentials.apiKeyId}}',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'APCA-API-SECRET-KEY': '={{$credentials.secretKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "paper" ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets"}}',
			url: '/v2/account',
			method: 'GET',
		},
	};
}
