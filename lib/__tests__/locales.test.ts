import { registerTranslations, translate } from '@/lib/i18n';
import { en } from '@/locales/en';
import { ko } from '@/locales/ko';

registerTranslations('ko', ko);
registerTranslations('en', en);

// Keys used by pages/chat/index.tsx through useTranslation('chat').
const CHAT_KEYS = [
  'status.ready',
  'status.assistantTyping',
  'status.userTyping',
  'typingIndicator.assistant',
  'inputPlaceholder',
  'send',
  'quickReplies'
];

describe('chat locale keys', () => {
  it.each(['ko', 'en'] as const)('resolves every chat key in %s', locale => {
    CHAT_KEYS.forEach(key => {
      expect(translate(`chat.${key}`, undefined, locale)).not.toBe(`chat.${key}`);
    });
  });
});
