"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Pencil, Trash2, Plus, Save, X, Copy, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { countTokens } from "@/lib/tokenizer"
import { cn } from "@/lib/utils"

export type Prompt = {
  id: string
  name: string
  content: string
  tokens: number
  isTemplate?: boolean
}

interface PromptManagerProps {
  onSelectPrompt: (prompt: Prompt) => void
  onSelectTemplate: (template: Prompt, userInput: string) => void
  systemPromptTokens: number
  userInput: string
}

const PromptManager = ({ onSelectPrompt, onSelectTemplate, systemPromptTokens, userInput }: PromptManagerProps) => {
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
  const [isTemplate, setIsTemplate] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-resize textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [newPromptContent, editingPrompt?.content])

  // Auto-resize textarea when editing
  useEffect(() => {
    if (editingPrompt && textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [editingPrompt])

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return

    const newPrompt: Prompt = {
      id: Date.now().toString(),
      name: newPromptName.trim(),
      content: newPromptContent.trim(),
      tokens: countTokens(newPromptContent.trim()),
      isTemplate: isTemplate,
    }

    setPrompts([...prompts, newPrompt])
    setNewPromptName("")
    setNewPromptContent("")
    setIsTemplate(false)
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

  const handleSelectPrompt = (prompt: Prompt, e?: React.MouseEvent) => {
    // Prevent event bubbling if event is provided
    if (e) {
      e.stopPropagation()
    }

    console.log("Selected prompt:", prompt)

    if (prompt.id === "system") {
      onSelectPrompt(prompt)
      // Only collapse if it's not the system prompt (to allow users to see the effect)
      if (prompt.id !== "system") {
        setIsExpanded(false)
      }
    } else if (prompt.isTemplate) {
      // For templates, we need to replace {query} with the user input
      onSelectTemplate(prompt, userInput)
      setIsExpanded(false)
    } else {
      // For regular prompts
      onSelectPrompt(prompt)
      setIsExpanded(false)
    }
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

  // Preview template with current user input
  const previewTemplate = (template: string, input: string) => {
    if (!input) return template.replace(/{query}/g, "[Your input will appear here]")
    return template.replace(/{query}/g, input)
  }

  return (
    <div className="w-full bg-gray-900 border-x border-gray-800 p-5">
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-base font-medium flex items-center gap-2">
            <span className="bg-orange-500 h-4 w-4 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{isExpanded ? "-" : "+"}</span>
            </span>
            Prompt Manager
            <span className="text-sm text-gray-400 ml-2">({prompts.length} saved prompts)</span>
          </h3>
          <div className="text-sm text-gray-400">System Prompt: {systemPrompt.tokens} tokens</div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-700">
            {/* System Prompt Section */}
            <div className="p-4 border-b border-gray-700 bg-gray-750">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">System Prompt</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{systemPrompt.tokens} tokens</span>
                  {!isEditingSystem ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setIsEditingSystem(true)}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyPrompt(systemPrompt.content)}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={handleUpdateSystemPrompt}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingSystem(false)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
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
                  className="w-full min-h-[80px] px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Enter system prompt..."
                />
              ) : (
                <div className="bg-gray-800 rounded p-2 text-sm text-gray-300 border border-gray-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {systemPrompt.content}
                </div>
              )}
            </div>

            {/* User Prompts List */}
            <div className="max-h-[400px] overflow-y-auto">
              {prompts.length === 0 && !isCreating ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No saved prompts. Create one to get started.
                </div>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {prompts.map((prompt) => (
                    <li key={prompt.id} className="p-3 hover:bg-gray-750 transition-colors">
                      {editingPrompt?.id === prompt.id ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
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
                            <div className="flex items-center ml-2">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingPrompt.isTemplate}
                                  onChange={(e) =>
                                    setEditingPrompt({
                                      ...editingPrompt,
                                      isTemplate: e.target.checked,
                                    })
                                  }
                                  className="sr-only"
                                />
                                <div
                                  className={cn(
                                    "w-9 h-5 rounded-full transition-colors flex items-center px-1",
                                    editingPrompt.isTemplate ? "bg-orange-500" : "bg-gray-600",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-3 h-3 rounded-full bg-white transition-transform",
                                      editingPrompt.isTemplate ? "translate-x-4" : "translate-x-0",
                                    )}
                                  ></div>
                                </div>
                                <span className="ml-2 text-xs text-gray-300">Template</span>
                              </label>
                            </div>
                          </div>
                          <textarea
                            ref={textareaRef}
                            value={editingPrompt.content}
                            onChange={(e) =>
                              setEditingPrompt({
                                ...editingPrompt,
                                content: e.target.value,
                                tokens: countTokens(e.target.value),
                              })
                            }
                            className="w-full min-h-[100px] px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
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
                            <div className="flex items-center">
                              <h4 className="text-sm font-medium text-gray-200">{prompt.name}</h4>
                              {prompt.isTemplate && (
                                <span className="ml-2 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                                  Template
                                </span>
                              )}
                            </div>
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

                          {prompt.isTemplate ? (
                            <div className="mt-2 space-y-2">
                              <div className="bg-gray-750 rounded p-2 text-xs text-gray-300 border border-gray-700 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                                {prompt.content}
                              </div>
                              <div className="bg-gray-900/50 rounded p-2 text-xs text-gray-300 border border-gray-700 whitespace-pre-wrap">
                                <div className="flex items-center mb-1">
                                  <Code className="h-3 w-3 mr-1 text-orange-400" />
                                  <span className="text-orange-400 font-medium">Preview with current input:</span>
                                </div>
                                {previewTemplate(prompt.content, userInput)}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 bg-gray-750 rounded p-2 text-xs text-gray-300 border border-gray-700 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                              {prompt.content}
                            </div>
                          )}

                          <button
                            onClick={(e) => handleSelectPrompt(prompt, e)}
                            className="mt-2 px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs hover:bg-orange-600/30 transition-colors"
                          >
                            {prompt.isTemplate ? "Use Template" : "Use Prompt"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Create New Prompt Form */}
              {isCreating && (
                <div className="p-4 border-t border-gray-700 space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Create New Prompt</h4>
                  <div className="flex justify-between">
                    <input
                      type="text"
                      value={newPromptName}
                      onChange={(e) => setNewPromptName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Prompt name"
                    />
                    <div className="flex items-center ml-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isTemplate}
                          onChange={(e) => setIsTemplate(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            "w-9 h-5 rounded-full transition-colors flex items-center px-1",
                            isTemplate ? "bg-orange-500" : "bg-gray-600",
                          )}
                        >
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full bg-white transition-transform",
                              isTemplate ? "translate-x-4" : "translate-x-0",
                            )}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-300">Template</span>
                      </label>
                    </div>
                  </div>

                  {isTemplate && (
                    <div className="bg-gray-750 rounded p-2 text-xs text-gray-400 border border-gray-700">
                      <p>
                        Use <code className="bg-gray-700 px-1 rounded">{"{query}"}</code> in your template to insert the
                        user's input.
                      </p>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    className="w-full min-h-[100px] px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    placeholder={
                      isTemplate ? "Enter prompt template with {query} placeholder..." : "Enter prompt content..."
                    }
                  />

                  {isTemplate && userInput && (
                    <div className="bg-gray-900/50 rounded p-2 text-xs text-gray-300 border border-gray-700 whitespace-pre-wrap">
                      <div className="flex items-center mb-1">
                        <Code className="h-3 w-3 mr-1 text-orange-400" />
                        <span className="text-orange-400 font-medium">Preview with current input:</span>
                      </div>
                      {previewTemplate(newPromptContent, userInput)}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">{countTokens(newPromptContent)} tokens</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreatePrompt}
                        className="px-2 py-1 bg-green-600/30 text-green-400 rounded text-xs hover:bg-green-600/50 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsCreating(false)
                          setIsTemplate(false)
                          setNewPromptName("")
                          setNewPromptContent("")
                        }}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Prompt Button */}
            {!isCreating && (
              <div className="p-3 border-t border-gray-700">
                <Button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-gray-750 hover:bg-gray-700 text-gray-300 border border-gray-600"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
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

