"use server"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export async function saveConversation(messages: Message[], fileName: string) {
  // In a real implementation, you would save to a file system
  // For this demo, we'll return a success response

  // Format the conversation as text
  const conversationText = messages
    .map((msg) => {
      const time = new Date(msg.timestamp).toLocaleString()
      return `[${time}] ${msg.role.toUpperCase()}:\n${msg.content}\n`
    })
    .join("\n---\n\n")

  // In a real implementation, you would write to a file
  // For example:
  // await fs.writeFile(`${fileName}.txt`, conversationText);

  // For demo purposes, we'll just return the text that would be saved
  return { success: true, fileName: `${fileName}.txt`, content: conversationText }
}

