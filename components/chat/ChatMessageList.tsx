import Image from 'next/image';
import { forwardRef, type CSSProperties } from 'react';

import { AssistantMessageBody } from '@/components/AssistantMessageBody';
import type { ChatMessage } from '@/lib/chat/model';
import { toDisplayText } from '@/lib/lyricsFormat';

type ChatMessageListProps = {
  messages: ChatMessage[];
  avatar: string;
  characterName: string;
  assistantBubbleStyle?: CSSProperties;
  isLoading: boolean;
  streamingText: string | null;
  typingLabel: string;
};

// Scrollable message column; the forwarded ref is the scroll container.
export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  function ChatMessageList(
    { messages, avatar, characterName, assistantBubbleStyle, isLoading, streamingText, typingLabel },
    ref
  ) {
    const avatarImage = (size: number) => (
      <Image
        src={avatar}
        alt={`${characterName} avatar`}
        width={size}
        height={size}
        style={{ borderRadius: 12, marginTop: 4 }}
      />
    );

    return (
      <div className="chat-layout__messages" ref={ref}>
        {messages.map(message => (
          <div
            key={message.id}
            className="chat-message"
            style={{ flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}
          >
            {message.role === 'assistant' ? avatarImage(32) : <div style={{ width: 32, height: 32 }} />}
            <div
              className={`chat-message__bubble ${
                message.role === 'user' ? 'chat-message__bubble--user' : 'chat-message__bubble--assistant'
              }`}
              style={message.role === 'assistant' && assistantBubbleStyle ? assistantBubbleStyle : undefined}
            >
              {message.role === 'assistant' ? (
                <AssistantMessageBody content={message.content} />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {isLoading && streamingText ? (
          <div className="chat-message">
            {avatarImage(32)}
            <div className="chat-message__bubble chat-message__bubble--assistant" style={assistantBubbleStyle}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{toDisplayText(streamingText)}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="chat-message">
            {avatarImage(32)}
            <div
              className="chat-message__bubble chat-message__bubble--assistant typing-indicator-wrapper"
              style={assistantBubbleStyle}
            >
              <div className="typing-indicator">
                <span className="typing-indicator__dot" />
                <span className="typing-indicator__dot" />
                <span className="typing-indicator__dot" />
              </div>
              <span className="typing-indicator__label">{typingLabel}</span>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);
