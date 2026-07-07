"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
//import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Send, Minimize2 } from "lucide-react"
import { useChatbot } from "./chatbot-provider"
// Remove: import { useTranslations } from "next-intl"

interface Message {
  id: string
  text: string
  timestamp: Date
  topic: string
  role: 'user' | 'assistant'
}

interface PredictionData {
  _id: string;
  batch_id?: string | { batch_id: string };
  grain_factors?: { grain_type: string };
  grain_type?: string;
  silo_id?: { name: string };
  risk_level?: string;
}

interface GrainBatch {
  _id: string
  batch_id: string
  grain_type: string
  silo_name: string
  quantity: number
  risk_level: string
}

export function ChatbotPopup() {
  const { isOpen, setIsOpen } = useChatbot()
  // Remove: const t = useTranslations('Chatbot')
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [grainBatches, setGrainBatches] = useState<GrainBatch[]>([])
  const [batchSearch, setBatchSearch] = useState("")
  const [selectedBatch, setSelectedBatch] = useState<GrainBatch | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch grain batches on mount
  useEffect(() => {
    const fetchGrainBatches = async () => {
      setBatchLoading(true)
      setBatchError(null)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          setBatchError("You must be signed in to use the chatbot.")
          setBatchLoading(false)
          return
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/ai-spoilage/predictions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error("Failed to fetch grain batches")
        const data = await res.json()
        const batches = (data.predictions || []).map((pred: PredictionData) => ({
          _id: pred._id,
          batch_id: typeof pred.batch_id === 'object' && pred.batch_id !== null ? pred.batch_id.batch_id : pred.batch_id || 'Unknown',
          grain_type: pred.grain_factors?.grain_type || pred.grain_type || 'Rice',
          silo_name: pred.silo_id && typeof pred.silo_id === 'object' && 'name' in pred.silo_id ? pred.silo_id.name : 'Unknown Silo',
          quantity: Math.floor(Math.random() * 5000) + 1000, // Mock quantity
          risk_level: pred.risk_level || 'low'
        }))
        setGrainBatches(batches as GrainBatch[])
      } catch {
        setBatchError("Failed to fetch grain batches");
      } finally {
        setBatchLoading(false)
      }
    }
    if (isOpen) fetchGrainBatches()
  }, [isOpen])

  // Filtered grain batches for search
  const filteredBatches: readonly GrainBatch[] = grainBatches.filter((batch: GrainBatch) => {
    const search = batchSearch.toLowerCase()
    return (
      (batch.batch_id && batch.batch_id.toLowerCase().includes(search)) ||
      (batch.grain_type && batch.grain_type.toLowerCase().includes(search)) ||
      (batch.silo_name && batch.silo_name.toLowerCase().includes(search)) ||
      (batch.risk_level && batch.risk_level.toLowerCase().includes(search))
    )
  })

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedBatch || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      timestamp: new Date(),
      topic: selectedBatch.batch_id,
      role: 'user',
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ text: m.text, role: m.role })),
          grainBatch: selectedBatch,
        }),
      })
      const data = await response.json()
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.aiMessage,
        timestamp: new Date(),
        topic: selectedBatch.batch_id,
        role: 'assistant',
      }
      setMessages(prev => [...prev, aiMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "Sorry, there was an error contacting the AI assistant.",
        timestamp: new Date(),
        topic: selectedBatch.batch_id,
        role: 'assistant',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isMinimized])

  if (!isOpen) return null

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[650px] shadow-2xl z-50 flex flex-col rounded-2xl border-0 bg-white overflow-hidden">
      <CardHeader className="flex items-center justify-between space-y-0  rounded-t-2xl bg-gray-900 text-white border-b border-gray-200 ">
        <div className="flex-1 flex items-center justify-center h-full">
          <CardTitle className="text-lg font-semibold tracking-tight pt-4 w-full">GrainHero AI Assistant</CardTitle>
        </div>
        <div className="flex items-center gap-2 ml-auto h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0 text-white hover:bg-gray-800 flex items-center justify-center"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 text-white hover:bg-gray-800 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col flex-1 p-0 bg-white h-full min-h-0 overflow-hidden">
          {/* Grain batch selection area */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            {batchError && <div className="text-red-500 text-sm mb-2">{batchError}</div>}
            {batchLoading ? (
              <div className="text-gray-500 text-sm">Loading grain batches...</div>
            ) : selectedBatch ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded px-3 py-2">
                <div>
                  <span className="font-semibold">{selectedBatch.batch_id}</span>
                  <span className="text-xs text-gray-500 ml-2">({selectedBatch.grain_type} - {selectedBatch.silo_name})</span>
                  <div className="text-xs text-gray-500">Risk: {selectedBatch.risk_level.toUpperCase()}</div>
                </div>
                <Button size="sm" variant="outline" className="ml-2 px-2 py-1 text-xs" onClick={() => setSelectedBatch(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter batch ID, grain type, or silo to search..."
                  value={batchSearch}
                  onChange={e => setBatchSearch(e.target.value)}
                  className="w-full mb-2 px-2 py-1 border rounded"
                  disabled={batchLoading}
                />
                <div className="max-h-40 overflow-y-auto border rounded">
                  {filteredBatches.length === 0 ? (
                    <div className="text-gray-400 text-sm p-2">No grain batches found.</div>
                  ) : (
                    filteredBatches.map((batch: GrainBatch) => {
                      // Type assertion to ensure TypeScript recognizes the batch type
                      const typedBatch = batch as GrainBatch;
                      return (
                        <div
                          key={typedBatch._id.toString()}
                          className="cursor-pointer px-3 py-2 hover:bg-green-50"
                          onClick={() => setSelectedBatch(typedBatch)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{typedBatch.batch_id}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              typedBatch.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                              typedBatch.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              typedBatch.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {typedBatch.risk_level.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">{typedBatch.grain_type} - {typedBatch.silo_name}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Conversation area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-4" style={{ background: 'white' }}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p>Welcome to GrainHero AI Assistant!</p>
                <p className="text-sm mt-2">Select a grain batch to get AI-powered insights about spoilage predictions, risk analysis, and storage recommendations.</p>
                <div className="mt-4 text-xs text-gray-500">
                  <p>💡 Ask about:</p>
                  <p>• Current risk levels and predictions</p>
                  <p>• Environmental conditions</p>
                  <p>• Storage recommendations</p>
                  <p>• Preventive measures</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"}>
                    <div className={message.role === 'user' ? "bg-gray-100 rounded-xl p-3 max-w-[80%] self-end shadow border border-gray-200" : "bg-blue-50 rounded-xl p-3 max-w-[80%] self-start shadow border border-blue-200"}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">{selectedBatch ? selectedBatch.batch_id : "Grain Batch"}</span>
                        {message.role === 'assistant' && <span className="ml-2 text-xs text-green-600 font-semibold">AI Assistant</span>}
                        {message.role === 'user' && <span className="ml-2 text-xs text-gray-400 font-semibold">You</span>}
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-line break-words">{message.text}</p>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 self-end">
                      {formatDate(message.timestamp)} at {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex flex-col items-start">
                    <div className="bg-blue-50 rounded-xl p-3 max-w-[80%] self-start shadow border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">AI</span>
                        <span className="ml-2 text-xs text-blue-600 font-semibold">AI</span>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-line break-words flex items-center">
                        <span className="animate-pulse">AI is typing...</span>
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area - always at the bottom */}
          <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0" style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-lg px-2 py-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your question about grain storage, spoilage, or risk analysis..."
                className="flex-1 bg-gray-50 border-0 text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none"
                disabled={!selectedBatch || isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !selectedBatch || isLoading}
                size="sm"
                className="px-3 bg-gray-900 text-white border-0 hover:bg-gray-800 rounded-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
} 