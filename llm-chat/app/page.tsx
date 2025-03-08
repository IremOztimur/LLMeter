"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Download, Trash2, BarChart3, DollarSign, Info, Settings } from "lucide-react"
import { saveConversation } from "./actions"
import { cn } from "@/lib/utils"
import { countTokens } from "@/lib/tokenizer"
import ConfigModal from "@/components/config-modal"
import { useOpenAI } from "@/lib/use-openai"

type Message = {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  tokens?: number
}

type TokenRates = {
  inputPrice: number
  outputPrice: number
  model: string
}

export default function Home() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [fileName, setFileName] = useState("conversation")
  const [tokenRates, setTokenRates] = useState<TokenRates>({
    inputPrice: 0.0000005, // $0.0005 per 1K tokens (e.g., GPT-4 input)
    outputPrice: 0.0000015, // $0.0015 per 1K tokens (e.g., GPT-4 output)
    model: "gpt-4o",
  })
  const [showTokenInfo, setShowTokenInfo] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const { sendMessage, isConfigured, currentModel, setApiKey, setModel, apiKey, baseUrl, setBaseUrl } = useOpenAI()

  // Calculate total tokens and costs
  const tokenStats = messages.reduce(
    (stats, message) => {
      const tokens = message.tokens || 0
      if (message.role === "user") {
        stats.inputTokens += tokens
      } else if (message.role === "assistant") {
        stats.outputTokens += tokens
      }
      return stats
    },
    { inputTokens: 0, outputTokens: 0 },
  )

  const totalTokens = tokenStats.inputTokens + tokenStats.outputTokens
  const inputCost = tokenStats.inputTokens * tokenRates.inputPrice
  const outputCost = tokenStats.outputTokens * tokenRates.outputPrice
  const totalCost = inputCost + outputCost

  // Calculate tokens for current input (for preview)
  const currentInputTokens = input ? countTokens(input) : 0

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Update model in token rates when it changes
  useEffect(() => {
    if (currentModel) {
      handleModelChange(currentModel)
    }
  }, [currentModel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userTokens = countTokens(input)

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      tokens: userTokens,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      if (isConfigured) {
        // Use the actual API
        const systemMessage = {
          role: "system" as const,
          content: "You are a helpful assistant.",
        }

        // Get all previous messages plus the new one
        const messageHistory = [
          systemMessage,
          ...messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          { role: "user" as const, content: input },
        ]

        const response = await sendMessage(messageHistory)

        if (response) {
          const assistantMessage: Message = {
            role: "assistant",
            content: response.content,
            timestamp: new Date().toISOString(),
            tokens: response.tokens || countTokens(response.content),
          }

          setMessages((prev) => [...prev, assistantMessage])
        } else {
          throw new Error("Failed to get response from API")
        }
      } else {
        // Simulate LLM response
        setTimeout(() => {
          const responseText = `This is a simulated response to: "${input}".\n\nIn a real implementation, you would connect to an actual LLM API here.`
          const responseTokens = countTokens(responseText)

          const assistantMessage: Message = {
            role: "assistant",
            content: responseText,
            timestamp: new Date().toISOString(),
            tokens: responseTokens,
          }

          setMessages((prev) => [...prev, assistantMessage])
        }, 1000)
      }
    } catch (error) {
      console.error("Error sending message:", error)

      // Add error message
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: Failed to get response from the API. Please check your API key and configuration.\n\nDetails: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        tokens: 0,
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConversation = async () => {
    try {
      await saveConversation(messages, fileName)
      alert(`Conversation saved as ${fileName}.txt`)
    } catch (error) {
      console.error("Failed to save conversation:", error)
      alert("Failed to save conversation")
    }
  }

  const clearConversation = () => {
    if (window.confirm("Are you sure you want to clear the chat?")) {
      setMessages([])
      // Focus back on the input field after clearing
      setTimeout(() => {
        const textarea = document.querySelector("textarea")
        if (textarea) textarea.focus()
      }, 100)
    }
  }

  const handleModelChange = (model: string) => {
    // Set rates based on model selection (example rates)
    switch (model) {
      case "gpt-3.5-turbo":
        setTokenRates({
          inputPrice: 0.0000001, // $0.0001 per 1K tokens
          outputPrice: 0.0000002, // $0.0002 per 1K tokens
          model: "gpt-3.5-turbo",
        })
        break
      case "claude-3-haiku":
        setTokenRates({
          inputPrice: 0.0000008, // $0.0008 per 1K tokens
          outputPrice: 0.0000024, // $0.0024 per 1K tokens
          model: "claude-3-haiku",
        })
        break
      case "gemini-2-flash":
        setTokenRates({
          inputPrice: 0.0000003, // $0.0003 per 1K tokens
          outputPrice: 0.0000006, // $0.0006 per 1K tokens
          model: "gemini-2-flash",
        })
        break
      case "gpt-4o":
      default:
        setTokenRates({
          inputPrice: 0.0000005, // $0.0005 per 1K tokens
          outputPrice: 0.0000015, // $0.0015 per 1K tokens
          model: "gpt-4o",
        })
    }

    // Update the model in the OpenAI hook
    setModel(model)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-100 p-4">
      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        model={currentModel}
        setModel={handleModelChange}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
      />

      {/* Header */}
      <div className="w-full max-w-5xl bg-gray-900 rounded-t-xl border border-gray-800 border-b-0">
        <header className="p-5">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              LLM Testing Framework
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsConfigOpen(true)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all duration-200 h-10 border",
                  isConfigured
                    ? "bg-green-600/20 text-green-400 border-green-700 hover:bg-green-600/30"
                    : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700",
                )}
                aria-label="Configure API"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">{isConfigured ? "API Configured" : "Config"}</span>
              </button>

              <div className="relative flex items-center group">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-l-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-100 w-40 h-10"
                  placeholder="conversation"
                />
                <button
                  onClick={handleSaveConversation}
                  className="flex items-center justify-center h-10 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-r-md transition-colors duration-200 border border-orange-600"
                  aria-label="Save conversation"
                >
                  <Download className="h-4 w-4" />
                </button>
                <span className="absolute -top-8 left-0 bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  Save conversation
                </span>
              </div>

              <button
                onClick={clearConversation}
                className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2.5 rounded-md transition-all duration-200 h-10 border border-gray-700 hover:border-gray-600"
                aria-label="Clear chat"
              >
                <Trash2 className="h-4 w-4 text-gray-300" />
                <span className="text-sm font-medium">Clear Chat</span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Token Counter and Cost Calculator */}
      <div className="w-full max-w-5xl bg-gray-900 border-x border-gray-800 p-5">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-400" />
              <h3 className="text-base font-medium">Token Usage</h3>
              <button
                onClick={() => setShowTokenInfo(!showTokenInfo)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
                aria-label="Token information"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-400">
                Model: <span className="text-gray-200">{tokenRates.model}</span>
              </div>
            </div>
          </div>

          {showTokenInfo && (
            <div className="mt-2 mb-3 p-3 bg-gray-750 rounded-md text-sm text-gray-300 border border-gray-700">
              <p className="mb-1">
                <strong>OpenAI Tokenization:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>1 token ≈ 4 characters in English text</li>
                <li>1 token ≈ ¾ of a word</li>
                <li>Spaces and punctuation count as tokens</li>
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-750 rounded p-3 border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Input</div>
              <div className="flex justify-between items-center">
                <span className="text-base font-medium">{tokenStats.inputTokens.toLocaleString()} tokens</span>
                <span className="text-sm text-gray-400">${inputCost.toFixed(6)}</span>
              </div>
            </div>

            <div className="bg-gray-750 rounded p-3 border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Output</div>
              <div className="flex justify-between items-center">
                <span className="text-base font-medium">{tokenStats.outputTokens.toLocaleString()} tokens</span>
                <span className="text-sm text-gray-400">${outputCost.toFixed(6)}</span>
              </div>
            </div>

            <div className="bg-gray-750 rounded p-3 border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Total</div>
              <div className="flex justify-between items-center">
                <span className="text-base font-medium">{totalTokens.toLocaleString()} tokens</span>
                <span className="text-sm text-orange-400 font-medium">${totalCost.toFixed(6)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Cost calculation: (input price × input tokens) + (output price × output tokens)</span>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div className="w-full max-w-5xl h-[65vh] bg-gray-900 border-x border-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        <div className="p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center space-y-3">
                <div className="inline-block p-4 rounded-full bg-gray-800 mb-3">
                  <Send className="h-7 w-7 text-orange-500" />
                </div>
                <p className="text-xl">Start a conversation to test your LLM model</p>
                <p className="text-base">
                  {isConfigured ? `Using ${currentModel} API` : "Configure API key to use real LLM models"}
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                  "transition-opacity duration-300 ease-in-out",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-5 py-4 shadow-md animate-fadeIn",
                    message.role === "user"
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      : "bg-gray-800 text-gray-100 border border-gray-700",
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div className="flex justify-between items-center mt-2 space-x-6">
                    <div className="text-xs opacity-70">{new Date(message.timestamp).toLocaleTimeString()}</div>
                    {message.tokens && <div className="text-xs opacity-70">{message.tokens} tokens</div>}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 max-w-[80%] shadow-md">
                <div className="flex space-x-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="w-full max-w-5xl bg-gray-900 rounded-b-xl border border-gray-800 border-t-0 p-5">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 flex flex-col">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[70px] bg-gray-800 border-gray-700 focus-visible:ring-orange-500 resize-none text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            {input && <div className="text-xs text-gray-400 mt-1 self-end">{currentInputTokens} tokens</div>}
          </div>
          <Button
            type="submit"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 px-5"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </main>
  )
}

