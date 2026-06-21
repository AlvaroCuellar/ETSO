import { env } from '$env/dynamic/private';

export const DEFAULT_FEEDBACK_RECIPIENT = 'alvarocuellar1995@hotmail.com';

export const getFeedbackRecipientEmail = (): string =>
	env.FEEDBACK_RECIPIENT_EMAIL?.trim() || DEFAULT_FEEDBACK_RECIPIENT;
