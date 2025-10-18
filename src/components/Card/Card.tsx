import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  /**
   * The content to display inside the card
   */
  children: React.ReactNode;
  /**
   * Optional click handler for interactive cards
   */
  onClick?: () => void;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Card variant for different visual styles
   */
  variant?: 'default' | 'elevated' | 'outlined';
  /**
   * Whether the card should be clickable with hover effects
   */
  clickable?: boolean;
  /**
   * Optional padding size
   */
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  className = '',
  variant = 'default',
  clickable = false,
  padding = 'md',
}) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    clickable || onClick ? styles.clickable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
};

export default Card;
