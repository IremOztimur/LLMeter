"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
  apiKey: string
  setApiKey: (key: string) => void
  model: string
  setModel: (model: string) => void
  baseUrl: string
  setBaseUrl: (url: string) => void
}

const ConfigModal = ({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  model,
  setModel,
  baseUrl,
  setBaseUrl,
}: ConfigModalProps) => {
  const [localApiKey, setLocalApiKey] = useState(apiKey)
  const [localModel, setLocalModel] = useState(model || "gpt-4o")
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl)
  const [provider, setProvider] = useState<"openai" | "google" | "anthropic" | "custom">("openai")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      setLocalApiKey(apiKey)
      setLocalModel(model || "gpt-4o")
      setLocalBaseUrl(baseUrl)

      // Determine provider based on baseUrl
      if (baseUrl.includes("generativelanguage.googleapis.com")) {
        setProvider("google")
      } else if (baseUrl.includes("anthropic.com")) {
        setProvider("anthropic")
      } else if (baseUrl === "https://api.openai.com/v1" || baseUrl === "") {
        setProvider("openai")
      } else {
        setProvider("custom")
      }

      setError("")
    }
  }, [isOpen, apiKey, model, baseUrl])

  const handleSave = () => {
    setIsSaving(true)
    setError("")

    try {
      // Validate API key
      if (!localApiKey.trim()) {
        throw new Error("API key is required")
      }

      // Set the base URL based on provider
      let finalBaseUrl = localBaseUrl
      if (provider === "openai") {
        finalBaseUrl = "https://api.openai.com/v1"
      } else if (provider === "google") {
        finalBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai"
      } else if (provider === "anthropic") {
        finalBaseUrl = "https://api.anthropic.com"
      }

      // Set the model based on provider if not already set
      let finalModel = localModel
      if (provider === "openai" && !finalModel) {
        finalModel = "gpt-4o"
      } else if (provider === "google" && !finalModel) {
        finalModel = "gemini-1.5-pro"
      } else if (provider === "anthropic" && !finalModel) {
        finalModel = "claude-3-haiku"
      }

      // Save configuration
      setApiKey(localApiKey)
      setModel(finalModel)
      setBaseUrl(finalBaseUrl)

      // Close modal
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleProviderChange = (newProvider: "openai" | "google" | "anthropic" | "custom") => {
    setProvider(newProvider)

    // Set default model based on provider
    if (newProvider === "openai") {
      setLocalModel("gpt-4o")
      setLocalBaseUrl("https://api.openai.com/v1")
    } else if (newProvider === "google") {
      setLocalModel("gemini-1.5-pro")
      setLocalBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai")
    } else if (newProvider === "anthropic") {
      setLocalModel("claude-3-haiku")
      setLocalBaseUrl("https://api.anthropic.com")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">API Configuration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  provider === "openai" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => handleProviderChange("openai")}
              >
                OpenAI
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  provider === "google" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => handleProviderChange("google")}
              >
                Google
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  provider === "anthropic" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => handleProviderChange("anthropic")}
              >
                Anthropic
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  provider === "custom" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => handleProviderChange("custom")}
              >
                Custom
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter your API key"
            />
            <p className="text-xs text-gray-400">
              Your API key is stored only in your browser session and is never sent to our servers.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label htmlFor="model" className="block text-sm font-medium text-gray-300">
              Model
            </label>
            {provider === "openai" && (
              <select
                id="model"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            )}

            {provider === "google" && (
              <select
                id="model"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            )}

            {provider === "anthropic" && (
              <select
                id="model"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            )}

            {provider === "custom" && (
              <input
                type="text"
                id="model"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter model name"
              />
            )}
          </div>

          {/* Base URL (only for custom provider) */}
          {provider === "custom" && (
            <div className="space-y-2">
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-300">
                Base URL
              </label>
              <input
                type="text"
                id="baseUrl"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://api.example.com/v1"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-red-300 text-sm">{error}</div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfigModal

