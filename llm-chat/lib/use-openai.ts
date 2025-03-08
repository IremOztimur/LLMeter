"use client"

import { useState, useEffect } from "react"
import { countTokens } from "./tokenizer"

type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

type ApiResponse = {
  content: string
  tokens?: number
}

type Provider = "openai" | "google" | "anthropic" | "custom"

export function useOpenAI() {
  const [apiKey, setApiKey] = useState<string>("")
  const [model, setModel] = useState<string>("gemini-2.0-flash")
  const [baseUrl, setBaseUrl] = useState<string>("https://generativelanguage.googleapis.com/v1beta")
  const [isConfigured, setIsConfigured] = useState<boolean>(false)
  const [currentProvider, setProvider] = useState<Provider>("google")

  // Load provider-specific API key from session storage on mount
  useEffect(() => {
    const storedProvider = sessionStorage.getItem("llm_provider") || "google"
    const storedApiKey = sessionStorage.getItem(`llm_api_key_${storedProvider}`)
    const storedModel = sessionStorage.getItem(`llm_model_${storedProvider}`)
    const storedBaseUrl = sessionStorage.getItem(`llm_base_url_${storedProvider}`)

    setProvider(storedProvider as Provider)
    
    if (storedApiKey) {
      setApiKey(storedApiKey)
    } else {
      setApiKey("")
    }

    if (storedModel) {
      setModel(storedModel)
    } else {
      // Set default model based on provider
      if (storedProvider === "openai") {
        setModel("gpt-4o")
      } else if (storedProvider === "google") {
        setModel("gemini-2.0-flash")
      } else if (storedProvider === "anthropic") {
        setModel("claude-3-haiku")
      }
    }

    if (storedBaseUrl) {
      setBaseUrl(storedBaseUrl)
    } else {
      // Set default base URL based on provider
      if (storedProvider === "openai") {
        setBaseUrl("https://api.openai.com/v1")
      } else if (storedProvider === "google") {
        setBaseUrl("https://generativelanguage.googleapis.com/v1beta")
      } else if (storedProvider === "anthropic") {
        setBaseUrl("https://api.anthropic.com")
      }
    }

    setIsConfigured(!!storedApiKey)
  }, [])

  // Save provider to session storage when it changes
  useEffect(() => {
    sessionStorage.setItem("llm_provider", currentProvider)
    
    // Load provider-specific settings when provider changes
    const storedApiKey = sessionStorage.getItem(`llm_api_key_${currentProvider}`)
    const storedModel = sessionStorage.getItem(`llm_model_${currentProvider}`)
    const storedBaseUrl = sessionStorage.getItem(`llm_base_url_${currentProvider}`)
    
    if (storedApiKey) {
      setApiKey(storedApiKey)
    } else {
      setApiKey("")
    }
    
    if (storedModel) {
      setModel(storedModel)
    } else {
      // Set default model based on provider
      if (currentProvider === "openai") {
        setModel("gpt-4o")
      } else if (currentProvider === "google") {
        setModel("gemini-2.0-flash")
      } else if (currentProvider === "anthropic") {
        setModel("claude-3-haiku")
      }
    }
    
    if (storedBaseUrl) {
      setBaseUrl(storedBaseUrl)
    } else {
      // Set default base URL based on provider
      if (currentProvider === "openai") {
        setBaseUrl("https://api.openai.com/v1")
      } else if (currentProvider === "google") {
        setBaseUrl("https://generativelanguage.googleapis.com/v1beta")
      } else if (currentProvider === "anthropic") {
        setBaseUrl("https://api.anthropic.com")
      }
    }
    
    setIsConfigured(!!storedApiKey)
  }, [currentProvider])

  // Save API key to session storage when it changes
  useEffect(() => {
    if (apiKey) {
      sessionStorage.setItem(`llm_api_key_${currentProvider}`, apiKey)
      setIsConfigured(true)
    } else {
      sessionStorage.removeItem(`llm_api_key_${currentProvider}`)
      setIsConfigured(false)
    }
  }, [apiKey, currentProvider])

  // Save model to session storage when it changes
  useEffect(() => {
    if (model) {
      sessionStorage.setItem(`llm_model_${currentProvider}`, model)
    } else {
      sessionStorage.removeItem(`llm_model_${currentProvider}`)
    }
  }, [model, currentProvider])

  // Save base URL to session storage when it changes
  useEffect(() => {
    if (baseUrl) {
      sessionStorage.setItem(`llm_base_url_${currentProvider}`, baseUrl)
    } else {
      sessionStorage.removeItem(`llm_base_url_${currentProvider}`)
    }
  }, [baseUrl, currentProvider])

  const sendMessage = async (messages: Message[]): Promise<ApiResponse | null> => {
    if (!apiKey) {
      throw new Error("API key is not configured")
    }

    try {
      // Determine the endpoint based on the base URL
      const isOpenAI = baseUrl.includes("openai.com")
      const isGoogle = baseUrl.includes("googleapis.com")
      const isAnthropic = baseUrl.includes("anthropic.com")

      let endpoint = ""
      let headers: Record<string, string> = {}
      let body: any = {}

      if (isOpenAI) {
        endpoint = `${baseUrl}/chat/completions`
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        }
        body = {
          model,
          messages,
          temperature: 0.7,
        }
      } else if (isGoogle) {
        // Updated Google API format
        const modelName = model.includes("/") ? model : `models/${model}`
        endpoint = `${baseUrl}/${modelName}:generateContent?key=${apiKey}`
        headers = {
          "Content-Type": "application/json",
        }
        
        // Convert OpenAI format to Google format
        const systemMessage = messages.find(m => m.role === "system")?.content || ""
        
        // Combine all user/assistant messages into a conversation
        const conversationParts = messages
          .filter(m => m.role !== "system")
          .map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
          }))
        
        body = {
          contents: conversationParts.length > 0 ? conversationParts : [{ 
            parts: [{ text: "Hello" }] 
          }],
          systemInstruction: systemMessage ? { parts: [{ text: systemMessage }] } : undefined,
          generationConfig: {
            temperature: 0.7,
          }
        }
      } else if (isAnthropic) {
        endpoint = `${baseUrl}/v1/messages`
        headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        }

        // Convert messages to Anthropic format
        const systemMessage = messages.find((m) => m.role === "system")?.content || ""
        const conversationMessages = messages.filter((m) => m.role !== "system")

        body = {
          model,
          messages: conversationMessages,
          system: systemMessage,
          temperature: 0.7,
        }
      } else {
        endpoint = `${baseUrl}/chat/completions`
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        }
        body = {
          model,
          messages,
          temperature: 0.7,
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()

      let content = ""
      let tokens = 0

      if (isOpenAI || !isAnthropic && !isGoogle) {
        content = data.choices[0].message.content
        tokens = data.usage?.completion_tokens || countTokens(content)
      } else if (isAnthropic) {
        content = data.content[0].text
        tokens = countTokens(content) // Anthropic doesn't provide token counts
      } else if (isGoogle) {
        // Extract content from Google's response format
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts.length > 0) {
          content = data.candidates[0].content.parts[0].text || ""
        }
        tokens = countTokens(content) // Google doesn't provide token counts in the same way
      }

      return {
        content,
        tokens,
      }
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  return {
    apiKey,
    setApiKey,
    model,
    setModel,
    baseUrl,
    setBaseUrl,
    isConfigured,
    sendMessage,
    currentModel: model,
    currentProvider,
    setProvider,
  }
}

