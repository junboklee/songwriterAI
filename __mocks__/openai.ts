const threadCreateMock = jest.fn();
const messageCreateMock = jest.fn();
const messageListMock = jest.fn();
const runCreateMock = jest.fn();
const runRetrieveMock = jest.fn();

const OpenAI = jest.fn().mockImplementation(() => ({
  beta: {
    threads: {
      create: threadCreateMock,
      messages: {
        create: messageCreateMock,
        list: messageListMock
      },
      runs: {
        create: runCreateMock,
        retrieve: runRetrieveMock
      }
    }
  }
}));

(OpenAI as unknown as { APIError: typeof Error }).APIError = class APIError extends Error {};
(OpenAI as unknown as { __mocks: Record<string, jest.Mock> }).__mocks = {
  threadCreateMock,
  messageCreateMock,
  messageListMock,
  runCreateMock,
  runRetrieveMock
};

export default OpenAI;
