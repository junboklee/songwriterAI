import type { ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import CharacterEditorPanel from '@/components/CharacterEditorPanel';
import { I18nProvider } from '@/context/I18nContext';
import { buildCharacterInstructions } from '@/lib/characterPrompt';

const baseCharacter = {
  id: 'character-id',
  name: 'Aurora',
  summary: 'Original summary',
  greeting: 'Hello there',
  longDescription: 'Original description',
  visibility: 'private' as const,
  avatarUrl: null,
  categories: [] as string[],
  gender: 'none' as const
};

const renderPanel = (
  overrides: Partial<ComponentProps<typeof CharacterEditorPanel>> = {}
) => {
  const onClose =
    overrides.onClose ??
    jest.fn<void, []>(() => {
      // noop
    });
  const onSubmit =
    (overrides.onSubmit as jest.MockedFunction<(payload: FormData) => void> | undefined) ??
    jest.fn<void, [FormData]>();

  const utils = render(
    <I18nProvider initialLocale="en">
      <CharacterEditorPanel
        character={{ ...baseCharacter, ...(overrides.character ?? {}) }}
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={overrides.isSubmitting ?? false}
        errorMessage={overrides.errorMessage ?? null}
      />
    </I18nProvider>
  );

  return {
    ...utils,
    onClose,
    onSubmit
  };
};

describe('CharacterEditorPanel', () => {
  it('allows adding categories through quick tags', () => {
    const { container } = renderPanel();

    const quickTag = screen.getByRole('button', { name: 'Helpers' });
    fireEvent.click(quickTag);

    const selectedTags = Array.from(container.querySelectorAll('.cai-selected-tag')).map(
      element => element.textContent ?? ''
    );

    expect(selectedTags.some(text => text.includes('Helpers'))).toBe(true);
  });

  it('submits trimmed form data via FormData payload', () => {
    const { container, onSubmit } = renderPanel();

    const nameInput = container.querySelector<HTMLInputElement>('#character-name');
    const summaryInput = container.querySelector<HTMLInputElement>('#character-summary');
    const greetingInput = container.querySelector<HTMLInputElement>('#character-greeting');
    const descriptionInput =
      container.querySelector<HTMLTextAreaElement>('#character-long-description');
    const categoryInput = container.querySelector<HTMLInputElement>('#categories');
    const genderSelect = container.querySelector<HTMLSelectElement>('#character-gender');

    expect(
      nameInput && summaryInput && greetingInput && descriptionInput && categoryInput && genderSelect
    ).toBeTruthy();

    fireEvent.change(nameInput!, { target: { value: '  Midnight Muse  ' } });
    fireEvent.change(summaryInput!, { target: { value: '  Dreamy synthwave ' } });
    fireEvent.change(greetingInput!, { target: { value: '  Whisper a tune  ' } });
    fireEvent.change(descriptionInput!, {
      target: { value: '  Focus on moody pop progressions.  ' }
    });

    fireEvent.change(categoryInput!, { target: { value: '  lunar  ' } });
    fireEvent.keyDown(categoryInput!, { key: 'Enter', code: 'Enter' });
    fireEvent.change(genderSelect!, { target: { value: 'female' } });

    const form = container.querySelector('form');
    fireEvent.submit(form!);

    expect(onSubmit).toHaveBeenCalledTimes(1);

    const formData = (onSubmit as jest.Mock).mock.calls[0][0] as FormData;
    const entries = Object.fromEntries(formData.entries());

    expect(entries.id).toBe(baseCharacter.id);
    expect(entries.name).toBe('Midnight Muse');
    expect(entries.shortDescription).toBe('Dreamy synthwave');
    expect(entries.greeting).toBe('Whisper a tune');
    expect(entries.longDescription).toBe('Focus on moody pop progressions.');
    expect(entries.visibility).toBe('private');
    expect(entries.gender).toBe('female');
    expect(entries.categories).toBe(JSON.stringify(['lunar']));

    const expectedInstructions = buildCharacterInstructions({
      name: 'Midnight Muse',
      shortDescription: 'Dreamy synthwave',
      greeting: 'Whisper a tune',
      longDescription: 'Focus on moody pop progressions.'
    });

    expect(entries.instructions).toBe(expectedInstructions);
  });

  it('sends avatar removal flag when resetting to the default image', () => {
    const { container, onSubmit } = renderPanel();

    const resetButton = screen.getByRole('button', { name: 'Remove image' });
    fireEvent.click(resetButton);

    const form = container.querySelector('form');
    fireEvent.submit(form!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = (onSubmit as jest.Mock).mock.calls[0][0] as FormData;
    const entries = Object.fromEntries(formData.entries());

    expect(entries.avatarRemoved).toBe('true');
  });
});
