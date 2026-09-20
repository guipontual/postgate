# Approval: why a human, and why it schedules

*[Português](approval.pt-BR.md)*

## Why there is a person in the middle

Automated generation fails in ways only a person notices: the same subject
twice in a week, a number that does not match the source, a tone that is not
the brand's. None of those show up in a test suite, and all of them show up in
public.

The gate is for approval, not for quality review. **Filtering out what is not
good enough is the source's job.** If the approver becomes the quality filter,
they learn to hit "reject" on autopilot and stop reading — and then the gate
stops being worth anything.

## Why approving schedules instead of publishing

Publishing at the moment of approval ties the post's timing to whenever
somebody happened to look at their phone. Separated:

- you can approve at 2am something that goes out in the morning;
- the server can be off between the approval and the publish;
- publishing becomes an isolated step that can be retried without repeating the
  human decision.

## Rejection that teaches

`postgate_feedback` stores why a post was rejected. Without it, the generator
proposes tomorrow exactly what was rejected today — and the person approving
pays the price of a memory the system does not have.
