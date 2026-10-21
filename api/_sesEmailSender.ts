import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import {
    SESv2Client,
    SendEmailCommand,
} from '@aws-sdk/client-sesv2';

import type { buildTaskSummaryEmail } from './_taskEmailContent.js';

type TaskEmailContent = Pick<
    ReturnType<typeof buildTaskSummaryEmail>,
    'subject' | 'html' | 'text'
>;

export type EmailDeliveryResult =
    | {
        status: 'simulated';
    }
    | {
        status: 'accepted';
        messageId: string | null;
    };

function isValidEmail(email: string): boolean {
    return (
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
}

export async function sendTaskSummaryEmail(
    recipientEmail: string,
    content: TaskEmailContent,
): Promise<EmailDeliveryResult> {
    if (!isValidEmail(recipientEmail)) {
        throw new Error('SES_INVALID_RECIPIENT');
    }

    if (
        !content.subject.trim() ||
        !content.html.trim() ||
        !content.text.trim()
    ) {
        throw new Error('SES_INVALID_CONTENT');
    }

    // El envío permanece desactivado por defecto.
    if (process.env.EMAIL_DELIVERY_MODE !== 'ses') {
        return { status: 'simulated' };
    }

    const region = process.env.AWS_REGION;
    const senderEmail = process.env.AWS_SES_FROM_EMAIL;
    const roleArn = process.env.AWS_ROLE_ARN;

    if (
        !region ||
        !senderEmail ||
        !isValidEmail(senderEmail) ||
        !roleArn
    ) {
        throw new Error('SES_NOT_CONFIGURED');
    }

    const client = new SESv2Client({
        region,
        maxAttempts: 2,
        credentials: awsCredentialsProvider({
            roleArn,
        }),
    });

    try {
        const command = new SendEmailCommand({
            FromEmailAddress: senderEmail,
            Destination: {
                ToAddresses: [recipientEmail],
            },
            Content: {
                Simple: {
                    Subject: {
                        Data: content.subject,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Html: {
                            Data: content.html,
                            Charset: 'UTF-8',
                        },
                        Text: {
                            Data: content.text,
                            Charset: 'UTF-8',
                        },
                    },
                },
            },
        });

        const result = await client.send(command);

        return {
            status: 'accepted',
            messageId: result.MessageId ?? null,
        };
    } finally {
        client.destroy();
    }
}
