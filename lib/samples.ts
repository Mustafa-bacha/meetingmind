export const SAMPLE_TRANSCRIPTS = {
  'Product Sprint': `Sarah (PM): Alright, let's get started. It's Monday 9am, we've got about an hour. Present today: Sarah, Marcus, Dev, Priya, and joining remote is Leo.

Marcus (Eng Lead): Before we start, quick heads up — the Jenkins pipeline has been flaky since Friday. I'll need someone to look at that today.

Sarah: Okay, let's add that as an action. Priya, can you take a look at the Jenkins issue and give Marcus an update by EOD?

Priya (DevOps): Yeah, I can do that. But wait, actually I thought we decided last week to migrate away from Jenkins entirely?

Marcus: We did, but that was supposed to be Q3, right?

Sarah: Right, Q3 is the target for the full migration. For now Jenkins is still live so Priya please fix the immediate issue. The migration plan — Marcus can you finalize the Jenkins-to-GitHub Actions migration doc by Friday?

Marcus: Will do.

Dev (Frontend): The new dashboard component is done. I pushed it to staging yesterday. One thing I'm not sure about — should we use the old color palette or the redesigned one? Design hasn't signed off yet.

Sarah: Good question. That's unresolved. Leo, can you chase design for sign-off? We need this by Wednesday because the demo is Thursday.

Leo (remote, slightly garbled): ...yeah I'll... [unclear] ...ping them today... sorry my audio was cutting out.

Sarah: Okay I'll mark that as Leo to ping design by today, but flagging that we need clarity here.

Priya: Also, the staging environment has a memory leak. It's not critical but it's causing slowdowns. I can fix it this sprint.

Sarah: Add it to the board, Priya. Medium priority.

Marcus: One more — we need to decide on the API rate limiting strategy before we can release v2. I think we go with token bucket algorithm. But Dev had a different opinion last week.

Dev: Yeah I was leaning towards fixed window. Either works but we need to decide.

Sarah: Let's decide now. Show of hands for token bucket? ... Okay, we're going with token bucket. Marcus, can you document the approach and get it reviewed by the team by Thursday?

Marcus: Yes.

Sarah: Alright. Any blockers?

Leo: ...the third party analytics SDK we're using... [audio dropout] ...billing issue...

Sarah: Leo, we're losing you. Can you send a message about the analytics blocker in Slack?

Leo: Yeah will do.

Sarah: Okay, I think that covers it. Key takeaways: Priya fixes Jenkins today, Marcus finishes migration doc by Friday, Leo chases design today, we're using token bucket for rate limiting. Meeting adjourned.`,

  'Messy Standup': `john ok so uh updates from my side i finished the login page but theres this weird bug where uh the password reset thing isnt sending emails i dont know if its our smtp or like the third party thing
anna yeah we saw that too actually wait no that was a different thing never mind um i worked on the data export feature its like 80% done
manager can you guys like be more specific what are the blockers
john so the email thing is a blocker for the login flow i guess someone needs to investigate it i dont know who
anna im blocked on design mockups for the export UI
manager ok who owns the email investigation
john maybe devops? but i dont know
anna also we didnt decide if we're doing csv only or also excel format
manager lets do both
john wait both means more work
manager lets do both but csv first
anna ok so csv first then excel when
manager soon
anna like this sprint?
manager yeah probably
john ok so the email thing
manager ill look into it i guess
anna cool anything else
john no
manager k bye`,

  'Conflict Example': `CEO: We need to cancel the mobile app development immediately. The costs are too high.

CTO: Wait, I disagree. We should absolutely continue the mobile app — it's central to our Q4 roadmap.

PM (Lisa): I thought we already decided last week to accelerate the mobile app timeline?

CEO: No, the decision is to stop the mobile app and redirect resources to the web platform.

CTO: I cannot support that. The mobile app was approved by the board. We should NOT cancel it.

Lisa: So are we canceling or continuing? I need to brief the team.

CEO: The mobile app is cancelled as of today. Final decision.

CTO: I'm going to escalate this to the board. This contradicts what we agreed.

Lisa: Okay I'll... wait for clarity before briefing the team. Who's making the final call here?

CEO: I am. Mobile app cancelled. Lisa, please start the web platform migration planning.

Lisa: Understood. When do you need the migration plan?

CEO: End of this week.

CTO: I'll have a call with the board tomorrow. This isn't resolved.`
};
