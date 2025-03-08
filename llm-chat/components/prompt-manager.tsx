"use client"

import { useState, useEffect } from "react"
import { Pencil, Trash2, Plus, Save, X, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { countTokens } from "@/lib/tokenizer"

export type Prompt = {
  id: string
  name: string
  content: string
  tokens: number
}

interface PromptManagerProps {
  onSelectPrompt: (prompt: Prompt) => void
  systemPromptTokens: number
}

const PromptManager = ({ onSelectPrompt, systemPromptTokens }: PromptManagerProps) => {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [newPromptName, setNewPromptName] = useState("")
  const [newPromptContent, setNewPromptContent] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState<Prompt>({
    id: "system",
    name: "System Prompt",
    content: "You are a helpful assistant.",
    tokens: systemPromptTokens || countTokens("You are a helpful assistant."),
  })
  const [isEditingSystem, setIsEditingSystem] = useState(false)

  // Load prompts from localStorage on mount
  useEffect(() => {
    const savedPrompts = localStorage.getItem("llm_prompts")
    if (savedPrompts) {
      try {
        setPrompts(JSON.parse(savedPrompts))
      } catch (e) {
        console.error("Failed to parse saved prompts:", e)
      }
    }

    const savedSystemPrompt = localStorage.getItem("llm_system_prompt")
    if (savedSystemPrompt) {
      try {
        setSystemPrompt(JSON.parse(savedSystemPrompt))
      } catch (e) {
        console.error("Failed to parse saved system prompt:", e)
      }
    }
  }, [])

  // Save prompts to localStorage when they change
  useEffect(() => {
    localStorage.setItem("llm_prompts", JSON.stringify(prompts))
  }, [prompts])

  // Save system prompt to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("llm_system_prompt", JSON.stringify(systemPrompt))
  }, [systemPrompt])

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return

    const newPrompt: Prompt = {
      id: Date.now().toString(),
      name: newPromptName.trim(),
      content: newPromptContent.trim(),
      tokens: countTokens(newPromptContent.trim()),
    }

    setPrompts([...prompts, newPrompt])
    setNewPromptName("")
    setNewPromptContent("")
    setIsCreating(false)
  }

  const handleUpdatePrompt = () => {
    if (!editingPrompt || !editingPrompt.name.trim() || !editingPrompt.content.trim()) return

    const updatedPrompt = {
      ...editingPrompt,
      name: editingPrompt.name.trim(),
      content: editingPrompt.content.trim(),
      tokens: countTokens(editingPrompt.content.trim()),
    }

    setPrompts(prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p)))
    setEditingPrompt(null)
  }

  const handleUpdateSystemPrompt = () => {
    if (!systemPrompt.content.trim()) return

    const updatedSystemPrompt = {
      ...systemPrompt,
      content: systemPrompt.content.trim(),
      tokens: countTokens(systemPrompt.content.trim()),
    }

    setSystemPrompt(updatedSystemPrompt)
    setIsEditingSystem(false)
  }

  const handleDeletePrompt = (id: string) => {
    if (window.confirm("Are you sure you want to delete this prompt?")) {
      setPrompts(prompts.filter((p) => p.id !== id))
    }
  }

  const handleSelectPrompt = (prompt: Prompt) => {
    onSelectPrompt(prompt)
    setIsExpanded(false)
  }

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        // Show a temporary success message or toast
        alert("Prompt copied to clipboard")
      })
      .catch((err) => {
        console.error("Failed to copy prompt:", err)
      })
  }

  return (
    <div className="p-3">
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div
          className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-sm font-medium flex items-center gap-2">
            <span className="bg-orange-500 h-3.5 w-3.5 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{isExpanded ? "-" : "+"}</span>
            </span>
            Prompt Manager
            <span className="text-xs text-gray-400 ml-1">({prompts.length} prompts)</span>
          </h3>
          <div className="text-xs text-gray-400">System: {systemPrompt.tokens} tokens</div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-700">
            {/* System Prompt Section - More compact */}
            <div className="p-3 border-b border-gray-700 bg-gray-750">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium text-gray-300">System Prompt</h4>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">{systemPrompt.tokens} tokens</span>
                  {!isEditingSystem ? (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingSystem(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPrompt(systemPrompt.content);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSystemPrompt();
                        }}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Save className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingSystem(false);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditingSystem ? (
                <textarea
                  value={systemPrompt.content}
                  onChange={(e) =>
                    setSystemPrompt({
                      ...systemPrompt,
                      content: e.target.value,
                      tokens: countTokens(e.target.value),
                    })
                  }
                  className="w-full h-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  placeholder="Enter system prompt..."
                />
              ) : (
                <div className="bg-gray-800 rounded p-2 text-xs text-gray-300 border border-gray-700 whitespace-pre-wrap max-h-16 overflow-y-auto">
                  {systemPrompt.content}
                </div>
              )}
            </div>

            {/* User Prompts List - More compact with max height */}
            <div className="max-h-40 overflow-y-auto">
              {prompts.length === 0 && !isCreating ? (
                <div className="p-2 text-center text-gray-400 text-xs">
                  No saved prompts. Create one to get started.
                </div>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {prompts.map((prompt) => (
                    <li key={prompt.id} className="p-2 hover:bg-gray-750 transition-colors">
                      {editingPrompt?.id === prompt.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingPrompt.name}
                            onChange={(e) =>
                              setEditingPrompt({
                                ...editingPrompt,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Prompt name"
                          />
                          <textarea
                            value={editingPrompt.content}
                            onChange={(e) =>
                              setEditingPrompt({
                                ...editingPrompt,
                                content: e.target.value,
                                tokens: countTokens(e.target.value),
                              })
                            }
                            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            placeholder="Enter prompt content..."
                          />
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">{editingPrompt.tokens} tokens</span>
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdatePrompt}
                                className="px-2 py-1 bg-green-600/30 text-green-400 rounded text-xs hover:bg-green-600/50 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPrompt(null)}
                                className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-200">{prompt.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{prompt.tokens} tokens</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setEditingPrompt(prompt)}
                                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCopyPrompt(prompt.content)}
                                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{prompt.content}</p>
                          <button
                            onClick={() => handleSelectPrompt(prompt)}
                            className="mt-2 px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs hover:bg-orange-600/30 transition-colors"
                          >
                            Use Prompt
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Create New Prompt Button - More compact */}
            {!isCreating && (
              <div className="p-2 border-t border-gray-700">
                <Button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-gray-750 hover:bg-gray-700 text-gray-300 border border-gray-600 h-7 text-xs"
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create New Prompt
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PromptManager

