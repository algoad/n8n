<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { ElSwitch } from 'element-plus';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useToast } from '@/app/composables/useToast';
import type { PermissionsRecord } from '@n8n/permissions';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/app/constants';

const props = defineProps<{
	workflowId: string;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const emit = defineEmits<{
	'update:tradingMode': [value: { id: string; tradingMode: 'mock' | 'paper' }];
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const toast = useToast();

const isNewWorkflow = computed(
	() =>
		!props.workflowId ||
		props.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
		props.workflowId === 'new',
);

const currentTradingMode = computed<'mock' | 'paper'>(() => {
	const settings = workflowsStore.workflowSettings;
	return (settings.tradingMode as 'mock' | 'paper') || 'mock';
});

const isPaperMode = computed(() => currentTradingMode.value === 'paper');

const disabled = computed((): boolean => {
	return isNewWorkflow.value || !props.workflowPermissions.update;
});

async function tradingModeChanged(newMode: string | number | boolean) {
	const boolValue = typeof newMode === 'boolean' ? newMode : Boolean(newMode);
	const newTradingMode: 'mock' | 'paper' = boolValue ? 'paper' : 'mock';

	try {
		await workflowsStore.updateWorkflowSetting(
			props.workflowId,
			'tradingMode' as any,
			newTradingMode,
		);
		emit('update:tradingMode', { id: props.workflowId, tradingMode: newTradingMode });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to update trading mode:', error);
		toast.showMessage({
			title: i18n.baseText('tradingModeToggle.updateFailed.title' as BaseTextKey),
			message:
				(error as Error).message ||
				i18n.baseText('tradingModeToggle.updateFailed.message' as BaseTextKey),
			type: 'error',
		});
	}
}
</script>

<template>
	<div class="trading-mode-toggle">
		<div :class="$style.modeStatusText" data-test-id="trading-mode-toggle-status">
			<N8nText :color="isPaperMode ? 'warning' : 'text-base'" size="small" bold>
				{{
					isPaperMode
						? i18n.baseText('tradingModeToggle.paper' as BaseTextKey)
						: i18n.baseText('tradingModeToggle.mock' as BaseTextKey)
				}}
			</N8nText>
		</div>
		<N8nTooltip :disabled="!disabled" placement="bottom">
			<template #content>
				<div>
					{{
						isNewWorkflow
							? i18n.baseText('tradingModeToggle.saveWorkflowFirst' as BaseTextKey)
							: i18n.baseText('tradingModeToggle.noPermission' as BaseTextKey)
					}}
				</div>
			</template>
			<ElSwitch
				:model-value="isPaperMode"
				:title="
					isPaperMode
						? i18n.baseText('tradingModeToggle.switchToMock' as BaseTextKey)
						: i18n.baseText('tradingModeToggle.switchToPaper' as BaseTextKey)
				"
				:disabled="disabled"
				active-color="#ff9800"
				inactive-color="#8899AA"
				data-test-id="trading-mode-toggle-switch"
				@update:model-value="tradingModeChanged"
			>
			</ElSwitch>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.modeStatusText {
	padding-right: var(--spacing--2xs);
	box-sizing: border-box;
	display: inline-block;
	text-align: right;
}
</style>

<style lang="scss" scoped>
.trading-mode-toggle {
	display: inline-flex;
	flex-wrap: nowrap;
	align-items: center;
}
</style>
