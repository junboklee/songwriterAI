import { useRef, useState, type ChangeEvent } from 'react';

import { AVATAR_MAX_BYTES } from '@/lib/characterFields';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

type AvatarMessages = { invalidType: string; tooLarge: string };

// Avatar file input state for character forms: validation, preview and "reset to default".
// `removed` tells the edit API to drop an existing avatar.
export function useAvatarPicker(initialUrl: string | null | undefined, messages: AvatarMessages) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialUrl || DEFAULT_CHARACTER_AVATAR);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }
    const problem = !ACCEPTED_IMAGE_TYPES.includes(selected.type)
      ? messages.invalidType
      : selected.size > AVATAR_MAX_BYTES
        ? messages.tooLarge
        : null;
    if (problem) {
      // Keep whatever was chosen before; only report the problem.
      setError(problem);
      clearInput();
      return;
    }

    setError(null);
    setFile(selected);
    setRemoved(false);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const reset = () => {
    clearInput();
    setFile(null);
    setPreview(DEFAULT_CHARACTER_AVATAR);
    setError(null);
    setRemoved(true);
  };

  return { inputRef, file, preview, error, removed, onChange, reset, open: () => inputRef.current?.click() };
}
