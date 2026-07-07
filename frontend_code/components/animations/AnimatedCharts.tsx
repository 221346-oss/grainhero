"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number }>

interface ChartData {
  name: string
  value: number
  color?: string
}

interface AnimatedBarChartProps {
  data: ChartData[]
  title: string
  className?: string
}

// Animated Bar Chart
export function AnimatedBarChart({ data, title, className = "" }: AnimatedBarChartProps) {
  const [animatedData, setAnimatedData] = useState(data.map(item => ({ ...item, value: 0 })))

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data)
    }, 500)
    return () => clearTimeout(timer)
  }, [data])

  return (
    <motion.div
      className={`bg-white rounded-lg shadow-lg p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h3
        className="text-lg font-semibold mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={animatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Bar
              dataKey="value"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            >
              {animatedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// Animated Line Chart
export function AnimatedLineChart({ data, title, className = "" }: AnimatedBarChartProps) {
  const [animatedData, setAnimatedData] = useState(data.map(item => ({ ...item, value: 0 })))

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data)
    }, 500)
    return () => clearTimeout(timer)
  }, [data])

  return (
    <motion.div
      className={`bg-white rounded-lg shadow-lg p-6 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h3
        className="text-lg font-semibold mb-4 flex items-center"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
        {title}
      </motion.h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={animatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// Animated Pie Chart
export function AnimatedPieChart({ data, title, className = "" }: AnimatedBarChartProps) {
  const [animatedData, setAnimatedData] = useState(data.map(item => ({ ...item, value: 0 })))

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data)
    }, 500)
    return () => clearTimeout(timer)
  }, [data])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <motion.div
      className={`bg-white rounded-lg shadow-lg p-6 ${className}`}
      initial={{ opacity: 0, rotate: -10 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h3
        className="text-lg font-semibold mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={animatedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {animatedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// Animated Area Chart
export function AnimatedAreaChart({ data, title, className = "" }: AnimatedBarChartProps) {
  const [animatedData, setAnimatedData] = useState(data.map(item => ({ ...item, value: 0 })))

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data)
    }, 500)
    return () => clearTimeout(timer)
  }, [data])

  return (
    <motion.div
      className={`bg-white rounded-lg shadow-lg p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h3
        className="text-lg font-semibold mb-4 flex items-center"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Activity className="w-5 h-5 mr-2 text-blue-500" />
        {title}
      </motion.h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={animatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fill="url(#colorGradient)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// Animated Metric Card
export function AnimatedMetricCard(
  {
    title,
    value,
    change,
    icon: Icon = Activity,
    color = "blue",
    className = ""
  }: {
    title: string
    value: React.ReactNode
    change?: number
    icon?: IconComponent
    color?: string
    className?: string
  }
) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100/50',
    green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/50',
    yellow: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100/50',
    red: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100/50',
    purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100/50'
  }

  return (
    <motion.div
      className={`bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 relative overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <motion.p
            className="text-[13px] font-bold text-slate-500 uppercase tracking-wider"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.p>
          <motion.div
            className="text-3xl font-black text-slate-800 tracking-tight"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.div>
          {change !== undefined && (
            <motion.div
              className={`flex items-center mt-3 ${change >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                } px-2 py-1 rounded-md w-fit`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
              )}
              <span className="text-[11px] font-bold">
                {Math.abs(change)}% vs last month
              </span>
            </motion.div>
          )}
        </div>
        <motion.div
          className={`p-3.5 rounded-2xl ${colorClasses[color as keyof typeof colorClasses]} shadow-sm`}
          initial={{ opacity: 0, scale: 0, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
          whileHover={{ scale: 1.1, rotate: 10 }}
        >
          <Icon className="w-6 h-6" strokeWidth={2} />
        </motion.div>
      </div>
      
      {/* Decorative background circle */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.03] pointer-events-none ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]}`} />
    </motion.div>
  )
}
