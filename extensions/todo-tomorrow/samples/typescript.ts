// TODO: Basic todo comment
// XXX: Basic hack comment
// HACK: Basic hack comment
// FIXME: Basic hack comment
// @todo: Basic todo comment
// @hack: Basic hack comment
//TODO: Basic todo comment
//@hack: Basic hack comment
// Shouldn't highlight TODO: or @todo in the middle

/* TODO: Multiline todo comment */
/* XXX: Multiline hack comment */
/* HACK: Multiline hack comment */
/* FIXME: Multiline hack comment */
/* @todo: Multiline todo comment */
/* @todo Multiline todo comment */
/* @hack: Multiline hack comment */
/*TODO: Multiline todo comment */
/*@hack: Multiline hack comment */
/* Shouldn't highlight TODO: or @todo in the middle */
/*
 * Shouldn't highlight TODO: or @todo (here it's highlighted by
 * VS Code's JSDoc support) in the middle
 */

/** TODO: Another multiline todo comment */
/** XXX: Another multiline hack comment */
/** HACK: Another multiline hack comment */
/** FIXME: Another multiline hack comment */
/** @todo: Another multiline todo comment */
/** @todo Another multiline todo comment */
/** @hack: Another multiline hack comment */
/** TODO: Another multiline todo comment */
/** @hack: Another multiline hack comment */
/**
 * Shouldn't highlight TODO: or @todo (here it's highlighted by VS Code's JSDoc
 * support) in the middle
 */

/**
 * A big header comment
 * TODO: Make it even bigger!
 */

/**
 * A big header comment
 *
 * @todo Make it even bigger!
 */

// @todo [2025-05-11]: Todo comment with a deadline
// TODO: [2019-11-15] Todo comment with a deadline
// @todo [2025-05-11] Todo comment with a deadline
// TODO: [>=1.0.0]: Todo comment with version
// TODO: (@lubien) [>0]: Todo comment with version and at-mention
// FIXME: [react>=19]: Fixme comment with a version
// XXX: [>10]: Fixme comment with a version

// These should NOT be highlighted
// TODO Basic todo comment
// xxx Basic todo comment
/* TODO Multiline todo comment */
/* xxx Multiline todo comment */
// @TODO Multiline todo comment
/* @XXX Multiline todo comment */
// Fix me baby one more time...
/* Fix me baby one more time... */
