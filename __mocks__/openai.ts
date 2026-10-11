// Root-level mock: Jest uses it automatically for every import of the `openai` package.
const responsesCreateMock = jest.fn();

const OpenAI = jest.fn().mockImplementation(() => ({
  responses: {
    create: responsesCreateMock
  }
}));

class APIError extends Error {}

Object.assign(OpenAI, {
  APIError,
  __mocks: { responsesCreateMock }
});

export default OpenAI;
