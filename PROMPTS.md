# PROMPTS

Raw, unedited prompts sent to AI tools while building this project, in chronological order.

- **Tool:** Claude Code (VS Code extension), model Claude Opus 5.5
- Prompts are copied verbatim (typos included). Nothing is summarised or rewritten.

---

## Prompt 1 — 2026-10-25

Hi, i have to work on a project that unvolves making a web-app as a task. The idea is to follow TDD (task driven development) to create the rpoject. The web-app to be made is a car-dealership web-app. The details of the task are in the pdf file AI_Kata_Car... . Additionally, on claude.ai, i had used teh deep-researchmode to get a better understanding of how to proceed with the task and the results obtained from the deep-research were stored into a .md file which also rests within the repository at the moment. The repo is not git tracked yet but it needs to be and the changes made, need to be pushed to github simultaneously as well, as the commit track is an important criteria for judgement. Additionally, a PROMPTS.md file has to be maintained but the information that goes into it is yet to be decided and for that i think we have 2 options - 1. You append all of my prompts to the md file everytime i send in one. That's the first step and it preceeeds any exec that is to be done as a part of what the prompt demands, option 2 - i export the chat to an md file after the project is done. Option 2 is a easy way to deal with this but it is also inefficient. Option 1 to me, looks better but that needs you to be on track. If you have a better suggestion lmk. And if needed we can do option 1 (or a better suggestion) and option 2 both.

We can start by planning out the different parts of the project. We should start by defining the directory structure and the frameworks. Next would be the execution part of it.

Do keep in mind to have exhaustive tests because the project is centered around TDD. And clean + exhaustively documented code is a must.

---

## Prompt 2 — 2026-10-25 20:31:05 IST

Okay, few things to keep in mind -0 
1. good catch on the red-green-refactor requirement.
2. In the md file from deep-research, there is info pointing to subsequent interview rounds and stuff like that. We would like to not refernce things and mentions of that sort that are not directly tied to the exec of this project and i believe it is better not to mention the deep research doc at all as it stays out of the public repo in any code comments. 

I have logged into github. There might be a rename issue from github's side tho. However this device is paired with the require gh account so you can go ahead with the repo creation and the push, it should be fine.

Lets get started.

---

## Prompt 3 — 2026-10-25 20:49:48 IST

"The research doc is not in the repo, and never was publicly." - yes. my point focused also on keeping its refernces out of comments in the code. We need exhaustive comments but they should not refernce it.
 
Regarding the decisions-
1. Yes admin only is fine.

Since we are at it, can you lay out how many phases are we targetting and what they will be? Once that is in place, i will give you th egreenlight to move forward.

---

## Prompt 4 — 2026-10-25 20:52:36 IST

The phases look good. Yes you can get started.

---

## Prompt 5 — 2026-10-25 21:07:43 IST

If needed, you can note down the need to update the readme in a md file in docs/. You can use it as a running log of what needs to be updated in the end if there is any slippage. Make sure to keep it out of git. Add it to gitignore. And best case scenario is to not have any pending work. 

Go on with phase 2.
