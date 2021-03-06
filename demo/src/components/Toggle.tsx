import React from 'react'
const noOp = () => {}

export const Toggle: React.FC<ToggleProps> = ({
  title,
  on,
  disabled = false,
  onClick = noOp,
  className = '',
}: ToggleProps) => {
  return (
    <span
      role="checkbox"
      aria-checked={on}
      aria-disabled={disabled}
      className={`${className}
        Toggle
        group relative inline-flex items-center justify-center 
        opacity-${disabled ? 50 : 100}      
        flex-shrink-0 h-4 w-8 cursor-pointer focus:outline-none`}
      title={title}
      onClick={disabled ? noOp : onClick}
    >
      {/* Slot */}
      <span
        aria-hidden="true"
        className={`absolute h-3 w-full mx-auto 
          rounded-full bg-${on ? 'green-500' : 'gray-300'} 
          transition-colors ease-in-out duration-200`}
      ></span>

      {/* Knob */}
      <span
        aria-hidden="true"
        className={`absolute left-0 inline-block h-4 w-4 
          transform translate-x-${on ? 4 : 0} 
          border border-gray-400 rounded-full bg-white shadow
          group-focus:shadow-outline group-focus:border-blue-300
          transition-transform ease-in-out duration-200`}
      ></span>
    </span>
  )
}
interface ToggleProps {
  title: string
  on: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}
