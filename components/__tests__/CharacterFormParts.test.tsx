import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';

import CharacterEditorPanel from '@/components/CharacterEditorPanel';
import { CategoryPicker } from '@/components/character/CategoryPicker';
import { I18nProvider } from '@/context/I18nContext';
import { useAvatarPicker } from '@/hooks/useAvatarPicker';

const renderPicker = (value: string[], onChange = jest.fn()) => {
  render(
    <CategoryPicker inputId="cat" label="카테고리" placeholder="입력" removeLabel="제거" value={value} onChange={onChange} />
  );
  return onChange;
};

describe('CategoryPicker', () => {
  it('adds a typed tag with Enter, but not while the IME is composing', () => {
    const onChange = renderPicker([]);
    const input = screen.getByPlaceholderText('입력');
    fireEvent.change(input, { target: { value: '발라' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: ' 발라드 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['발라드']);
  });

  it('stops adding at the limit and shows the count', () => {
    const onChange = renderPicker(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(screen.getByText('카테고리 (8/8)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('입력')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anime' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag', () => {
    const onChange = renderPicker(['발라드', '인디']);
    fireEvent.click(screen.getAllByRole('button', { name: '제거' })[0]);
    expect(onChange).toHaveBeenCalledWith(['인디']);
  });
});

describe('useAvatarPicker', () => {
  const messages = { invalidType: '형식 오류', tooLarge: '용량 초과' };
  const pick = (file: File) => ({ target: { files: [file] } }) as unknown as ChangeEvent<HTMLInputElement>;

  it('rejects other file types and oversized images without losing the current choice', () => {
    const { result } = renderHook(() => useAvatarPicker('https://example.com/a.png', messages));
    act(() => result.current.onChange(pick(new File(['x'], 'a.gif', { type: 'image/gif' }))));
    expect(result.current.error).toBe('형식 오류');
    expect(result.current.preview).toBe('https://example.com/a.png');

    const big = new File(['x'], 'b.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
    act(() => result.current.onChange(pick(big)));
    expect(result.current.error).toBe('용량 초과');
    expect(result.current.file).toBeNull();
  });

  it('accepts a valid image and marks a reset as removal', () => {
    const { result } = renderHook(() => useAvatarPicker(null, messages));
    const file = new File(['x'], 'c.webp', { type: 'image/webp' });
    act(() => result.current.onChange(pick(file)));
    expect(result.current.file).toBe(file);
    expect(result.current.removed).toBe(false);

    act(() => result.current.reset());
    expect(result.current.file).toBeNull();
    expect(result.current.removed).toBe(true);
  });
});

describe('CharacterEditorPanel', () => {
  const character = {
    id: 'c1',
    name: 'Aurora',
    summary: '',
    greeting: '',
    longDescription: '',
    visibility: 'private' as const
  };

  const panel = (props: { isSubmitting?: boolean; errorMessage?: string | null }) => (
    <I18nProvider initialLocale="ko">
      {/* A new object on every render, as the dashboard passes it. */}
      <CharacterEditorPanel key="c1" character={{ ...character }} onClose={jest.fn()} onSubmit={jest.fn()} {...props} />
    </I18nProvider>
  );

  it('keeps what was typed when the parent re-renders while saving and the save fails', () => {
    const { container, rerender } = render(panel({}));
    const nameInput = container.querySelector<HTMLInputElement>('#character-name')!;
    fireEvent.change(nameInput, { target: { value: '새 이름' } });

    rerender(panel({ isSubmitting: true }));
    rerender(panel({ isSubmitting: false, errorMessage: '저장 실패' }));

    expect(container.querySelector<HTMLInputElement>('#character-name')!.value).toBe('새 이름');
    expect(screen.getByText('저장 실패')).toBeInTheDocument();
  });

  it('lets a character without a long description be saved', () => {
    const { container } = render(panel({}));
    const description = container.querySelector<HTMLTextAreaElement>('#character-long-description')!;
    expect(description.required).toBe(false);
    expect(description.maxLength).toBe(4000);
  });
});
