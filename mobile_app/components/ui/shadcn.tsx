import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <View className={cn("bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden", className)}>
    {children}
  </View>
);

export const Button = ({ 
  className, 
  variant = 'default', 
  size = 'default',
  children,
  ...props 
}: { 
  className?: string, 
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'admin',
  size?: 'default' | 'sm' | 'lg' | 'icon',
  children: React.ReactNode,
  [key: string]: any
}) => {
  const variants = {
    default: "bg-slate-900 dark:bg-slate-50 text-slate-50 dark:text-slate-900",
    outline: "border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-50",
    ghost: "bg-transparent text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50",
    admin: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20",
  };

  const sizes = {
    default: "h-12 px-6 rounded-2xl",
    sm: "h-9 px-3 rounded-xl",
    lg: "h-14 px-8 rounded-2xl",
    icon: "h-10 w-10 rounded-full",
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      className={cn(
        "flex-row items-center justify-center gap-2 font-bold",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export const Badge = ({ className, variant = 'default', children }: { className?: string, variant?: 'default'|'destructive'|'success'|'warning'|'outline', children: React.ReactNode }) => {
  const variants = {
    default: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50",
    destructive: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    outline: "border border-slate-200 dark:border-slate-800 text-slate-500",
  };

  return (
    <View className={cn("px-2.5 py-0.5 rounded-full", variants[variant], className)}>
      <Text className="text-[10px] font-black uppercase tracking-widest">{children}</Text>
    </View>
  );
};
