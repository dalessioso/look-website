import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import './liquid-glass-button.css';

/**
 * Adapted from Designali's LiquidButton shared by the user from 21st.dev.
 * Source: https://21st.dev/@designali-in/components/liquid-glass-button
 * Retains its layered inset highlights and SVG backdrop displacement, with
 * native elements, scoped CSS, and an unfiltered text layer for Look.
 */
export type LiquidButtonSize = 'sm' | 'default' | 'lg';

type LiquidAppearance = {
  size?: LiquidButtonSize;
  'data-preview-state'?: 'hover' | 'focus' | 'pressed';
};
type NativeLiquidButtonProps = ComponentPropsWithRef<'button'> & LiquidAppearance & { href?: never };
type NativeLiquidLinkProps = Omit<ComponentPropsWithRef<'a'>, 'href'> & LiquidAppearance & { href: string; disabled?: never };
export type LiquidButtonProps = NativeLiquidButtonProps | NativeLiquidLinkProps;

function GlassLayers({ children }: { children: ReactNode }) {
  const filterId = `look-liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <>
    <span className="liquid-glass__backdrop" aria-hidden="true" />
    <span className="liquid-glass__refraction" aria-hidden="true" style={{ backdropFilter: `url("#${filterId}")`, WebkitBackdropFilter: `url("#${filterId}")` }} />
    <span className="liquid-glass__highlight" aria-hidden="true" />
    <span className="liquid-glass__content">{children}</span>
    <svg className="liquid-glass__definitions" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="36" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  </>;
}

function classes(size: LiquidButtonSize, className?: string) {
  return ['liquid-glass', `liquid-glass--${size}`, className].filter(Boolean).join(' ');
}

/** Real anchor with href; otherwise a native button with native disabled/form behavior. */
export function LiquidButton(props: LiquidButtonProps) {
  if (typeof props.href === 'string') {
    const { children, className, size = 'default', href, ref, ...anchorProps } = props;
    return <a {...anchorProps} ref={ref} href={href} className={classes(size, className)}>
      <GlassLayers>{children}</GlassLayers>
    </a>;
  }
  const { children, className, size = 'default', type = 'button', ref, ...buttonProps } = props;
  return <button {...buttonProps} ref={ref} type={type} className={classes(size, className)}>
    <GlassLayers>{children}</GlassLayers>
  </button>;
}
