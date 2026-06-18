import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PulsePhotoViewerModalHost } from '@/components/mypage/PulsePhotoViewerModal';
import type {
  OpenPulsePhotoViewerInput,
  PulsePhotoViewerCreator,
} from '@/lib/media/pulsePhotoViewerTypes';

type PulsePhotoViewerContextValue = {
  open: (input: OpenPulsePhotoViewerInput) => void;
  close: () => void;
  defaultCreator: PulsePhotoViewerCreator | null;
};

const PulsePhotoViewerContext = createContext<PulsePhotoViewerContextValue | null>(null);

export function PulsePhotoViewerProvider({
  children,
  creator,
}: {
  children: ReactNode;
  creator: PulsePhotoViewerCreator;
}) {
  const [session, setSession] = useState<OpenPulsePhotoViewerInput | null>(null);

  const open = useCallback((input: OpenPulsePhotoViewerInput) => {
    if (!input.items?.length) return;
    setSession(input);
  }, []);

  const close = useCallback(() => {
    setSession((prev) => {
      const onClosed = prev?.onClosed;
      if (onClosed) {
        requestAnimationFrame(onClosed);
      }
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      open,
      close,
      defaultCreator: creator,
    }),
    [open, close, creator],
  );

  return (
    <PulsePhotoViewerContext.Provider value={value}>
      {children}
      {session ? (
        <PulsePhotoViewerModalHost
          {...session}
          defaultCreator={creator}
          onClose={close}
        />
      ) : null}
    </PulsePhotoViewerContext.Provider>
  );
}

export function usePulsePhotoViewer() {
  const ctx = useContext(PulsePhotoViewerContext);
  if (!ctx) {
    return {
      open: (_input: OpenPulsePhotoViewerInput) => {},
      close: () => {},
      available: false as const,
    };
  }
  return { ...ctx, available: true as const };
}
