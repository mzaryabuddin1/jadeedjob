import {
  chatConversationSchema,
  chatMessageSchema,
  chatOutboxSchema,
  chatParticipantSchema,
  chatReadStateSchema,
} from './chat-mongo.schemas';

const namedIndexes = (schema: any) =>
  new Map(schema.indexes().map((entry: any[]) => [entry[1]?.name, entry]));

describe('Mongo chat schemas', () => {
  it('defines stable conversation, participant, message, and read indexes', () => {
    expect(namedIndexes(chatConversationSchema)).toHaveProperty('size', 3);
    expect(
      namedIndexes(chatConversationSchema).has(
        'UQ_chat_conversations_application',
      ),
    ).toBe(true);
    expect(
      namedIndexes(chatParticipantSchema).has(
        'UQ_chat_participants_conversation_user',
      ),
    ).toBe(true);
    expect(
      namedIndexes(chatMessageSchema).has(
        'UQ_chat_messages_conversation_sequence',
      ),
    ).toBe(true);
    expect(
      namedIndexes(chatMessageSchema).has(
        'UQ_chat_messages_conversation_sender_client',
      ),
    ).toBe(true);
    expect(
      namedIndexes(chatReadStateSchema).has(
        'UQ_chat_read_states_conversation_user',
      ),
    ).toBe(true);
    expect(namedIndexes(chatOutboxSchema).has('UQ_chat_outbox_event_key')).toBe(
      true,
    );
  });
});
