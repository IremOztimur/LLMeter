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

export function useOpenAI() {
  const [apiKey, setApiKey] = useState<string>("")
  const [model, setModel] = useState<string>("gpt-4o")
  const [baseUrl, setBaseUrl] = useState<string>("https://api.openai.com/v1")
  const [isConfigured, setIsConfigured] = useState<boolean>(false)

  // Load API key from session storage on mount
  useEffect(() => {
    const storedApiKey = sessionStorage.getItem("llm_api_key")
    const storedModel = sessionStorage.getItem("llm_model")
    const storedBaseUrl = sessionStorage.getItem("llm_base_url")

    if (storedApiKey) {
      setApiKey(storedApiKey)
    }

    if (storedModel) {
      setModel(storedModel)
    }

    if (storedBaseUrl) {
      setBaseUrl(storedBaseUrl)
    }

    setIsConfigured(!!storedApiKey)
  }, [])

  // Save API key to session storage when it changes
  useEffect(() => {
    if (apiKey) {
      sessionStorage.setItem("llm_api_key", apiKey)
      setIsConfigured(true)
    } else {
      sessionStorage.removeItem("llm_api_key")
      setIsConfigured(false)
    }
  }, [apiKey])

  // Save model to session storage when it changes
  useEffect(() => {
    if (model) {
      sessionStorage.setItem("llm_model", model)
    } else {
      sessionStorage.removeItem("llm_model")
    }
  }, [model])

  // Save base URL to session storage when it changes
  useEffect(() => {
    if (baseUrl) {
      sessionStorage.setItem("llm_base_url", baseUrl)
    } else {
      sessionStorage.removeItem("llm_base_url")
    }
  }, [baseUrl])

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
  }
}

