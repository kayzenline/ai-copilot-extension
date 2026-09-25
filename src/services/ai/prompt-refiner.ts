export class PromptRefiningService {
  static getRefineSystemPrompt(): string {
    return `You are a Prompt Engineering Expert. Your job is to take a simple user instruction and transform it into a structured, high-performance "Super Prompt".

Follow this framework:
1. **[Role]**: Define a specific expert persona for the AI to adopt
2. **[Context]**: Expand on the background and scenario 
3. **[Task]**: Clearly define the objective
4. **[Format]**: Specify the desired output structure
5. **[Tone]**: Define the communication style
6. **[Constraints]**: Add boundaries and rules
7. **[Examples]**: Provide a brief example if helpful

Output the refined prompt directly. Use [Context], [Format], [Tone], and [Role] as labeled section tags. Do NOT explain what you did — just output the refined super prompt.`;
  }

  static formatUserPrompt(rawPrompt: string): string {
    return `Transform this into a Super Prompt:\n\n"${rawPrompt.trim()}"`;
  }

  static highlightVariables(text: string): string {
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    return escapeHtml(text)
      .replace(/\[Context\]/gi, '<span class="var-context">[Context]</span>')
      .replace(/\[Format\]/gi, '<span class="var-format">[Format]</span>')
      .replace(/\[Tone\]/gi, '<span class="var-tone">[Tone]</span>')
      .replace(/\[Role\]/gi, '<span class="var-role">[Role]</span>')
      .replace(/\[Task\]/gi, '<span class="var-task">[Task]</span>')
      .replace(/\[Constraints\]/gi, '<span class="var-constraints">[Constraints]</span>');
  }
}
