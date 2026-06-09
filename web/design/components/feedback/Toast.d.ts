import * as React from 'react';

/** Notification toast. */
export interface ToastProps {
  tone?: 'default' | 'success' | 'warning' | 'danger';
  title?: React.ReactNode;
  /** Description (children). */
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Toast(props: ToastProps): JSX.Element;

export interface ToastViewportProps { children?: React.ReactNode; }

/** Fixed bottom-right container that stacks Toasts. */
export function ToastViewport(props: ToastViewportProps): JSX.Element;
