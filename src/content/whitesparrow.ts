// Pure — no `obsidian` import. The starter campaign's content: "The Village
// of Whitesparrow" and "The Night Blade" adventure from the Lazy GM's
// Resource Document (CC-BY 4.0, Michael E. Shea / Sly Flourish — see
// `attribution.ts`; those sections come from Sly Flourish's Fantastic
// Adventures and are explicitly released under the same license). Condensed
// and lightly adapted to the plugin's note shapes; the builder that turns
// this into vault notes is `src/campaigns/starter-campaign.ts`.

export const WHITESPARROW_NAME = "Whitesparrow";

export const WHITESPARROW_PITCH = [
	"Nestled between mountains and swampland, the village of Whitesparrow serves travelers on a modest trade route — five hundred souls, an old keep on the hill, and a colossal black-stone hand rising from the village center that generations have tried and failed to excavate.",
	"",
	"Now the notorious bandit chieftain Ralavaz the Night Blade has been released from prison, and a new gang preys on wagons and travelers from his old hideout. Sheriff Willowmane wants it ended for good.",
	"",
	"*Adapted from “The Village of Whitesparrow” and “The Night Blade” in the Lazy GM's Resource Document (CC-BY 4.0).*",
].join("\n");

export const WHITESPARROW_TRUTHS: readonly string[] = [
	"A giant hand of indestructible black stone — the cyclopean palm — rises at the village center; no one knows what lies beneath.",
	"Every crew that dug beneath the palm gave up after nightmares filled with strange buzzing.",
	"Sheriff Ruth Willowmane is the village's true protector; young Lord Whitesparrow holds the title.",
	"Ten years ago the Night Blade bandits were burned alive in a barn by angry villagers — only their leader Ralavaz survived.",
	"Trade caravans have started taking safer roads, and the village feels the loss.",
	"The Summerspring Inn sits on hot springs above caverns rumored to hold gemstones, relics, and worse.",
];

export const WHITESPARROW_FRONT = {
	name: "The Night Blades reborn",
	goal: "Destroy the folk of Whitesparrow in revenge for the barn fire.",
	portents: [
		"Wagons and travelers attacked on the vale road",
		"The golden-masked Night Lord is seen commanding the bandits",
		"A cloud of bats leaves a bloodless elk husk near the Lonely Torch",
	],
	doom: "Whitesparrow bleeds until nothing is left to steal — or to save.",
} as const;

export interface StarterNpc {
	name: string;
	role: string;
	body: string;
}

export const WHITESPARROW_NPCS: readonly StarterNpc[] = [
	{
		name: "Sheriff Ruth Willowmane",
		role: "sheriff",
		body: "The village's true protector and unofficial leader: twenty years a sheriff, fifteen a soldier before that. Good-hearted, beloved, and short on patience for adventurers — but she knows the odd threats around Whitesparrow need special skills. Her younger brother Dronder was slain by Ralavaz eleven years ago, and the bandit never paid for it. She commands eight guards and can conscript twelve more.",
	},
	{
		name: "Lord Marlin Whitesparrow",
		role: "village lord",
		body: "The young lord of the village, residing in the old hilltop keep his family has held for generations. Well respected despite his age, but bored by the drudgery of village life. Unmarried; his adopted ward and heir is his young nephew Pennin. If both die, the Whitesparrow line breaks and the elected leadership falls to Sheriff Willowmane.",
	},
	{
		name: "Amanda Jess",
		role: "innkeeper",
		body: "Owner of the Summerspring Inn and the Evershady Tavern — Whitesparrow's dominant entrepreneur, with three sons (Kinzlow, Balaham, Wess) working her establishments. She has an uncanny knack for drawing out newcomers' backgrounds and finding the business opportunity in them. Some whisper she was once a spy for a powerful organization.",
	},
	{
		name: "Gavun Grayhorn",
		role: "outfitter",
		body: "A former adventurer whose fortune always eluded him; the sole survivor of his last expedition. He runs Grayhorn Outfitters with his wife Arianne — just as the caravans his shop depends on began avoiding Whitesparrow. Such is the luck of Gavun Grayhorn.",
	},
	{
		name: "Elovyn Sorrowsong",
		role: "priest",
		body: "An elf priest of the Temple of Light, sent from her homeland on a hundred-year pilgrimage she still resents. She has come to care deeply for the village and enjoys being Whitesparrow's only elf in authority — which makes her instinctively distrustful of other elves passing through.",
	},
	{
		name: "Philcock Deadcleft",
		role: "inn manager",
		body: "Manager of the Summerspring Inn: a small, ugly rumormonger who spies on the patrons, dresses in noble cut gone shabby, and always smells terrible. For reasons unknown, Amanda Jess has always protected him.",
	},
	{
		name: "Ralavaz the Night Blade",
		role: "repentant bandit chieftain",
		body: "Elder of the two brothers who led the Night Blades, and the only known survivor of the barn fire. His execution was commuted after he saved a noble's son in a prison riot; released after ten years, he returned to the Lonely Torch. Unknown to most, he has repented and follows the goddess of light — he came back to beg his brother's forgiveness and turn Gardren from banditry. It cost him: Gardren keeps him imprisoned in the tower's mud pit.",
	},
	{
		name: "Gardren the Night Lord",
		role: "bandit lord",
		body: "The younger brother everyone believes died in the barn fire. Disfigured by it, he leads the new Night Blades behind a golden mask — not for profit, but to see Whitesparrow destroyed in the name of his dead friends. He has learned to tame stirges; his pet Heartspine never leaves him.",
	},
];

export interface StarterLocation {
	name: string;
	aspects: readonly string[];
	body: string;
}

export const WHITESPARROW_LOCATIONS: readonly StarterLocation[] = [
	{
		name: "The Cyclopean Palm",
		aspects: [
			"Titanic six-fingered hand rising out of the ground",
			"Unknown and indestructible substance",
			"Deep excavations and a rumored staircase",
		],
		body: "A forty-foot hand of smooth black stone, palm to the sky, at the village center. Digs around the wrist confirm a forearm descending far below; every excavation ended when the crews' nightmares filled with strange buzzing. Rumor holds the wrist is hollow, with a staircase down to a chamber said to be the boundary between two worlds.",
	},
	{
		name: "The Evershady Tavern",
		aspects: [
			"Continual shade under the cyclopean palm",
			"Circular bar built around the stone wrist",
			"Cellars dug by failed expeditions",
		],
		body: "Amanda Jess's tavern beneath the great palm, famous for a spiced lamb stew some credit to the kitchen's proximity to the stone. The vast cellars below were dug by expeditions that found nothing but bankruptcy and madness.",
	},
	{
		name: "The Summerspring Inn",
		aspects: [
			"Underground hot springs feeding stone baths",
			"Creaking, rotting wood on heavy support beams",
			"Dry-spring caverns below, full of rumors",
		],
		body: "A two-story inn sitting askew on the hot springs that are slowly rotting it from below. Lower rooms have their own sulfur-scented baths; the springs that went dry left caverns beneath said to hold gemstone deposits, lost relics, and secret horrors. Owned by Amanda Jess, managed by Philcock Deadcleft.",
	},
	{
		name: "The Tangles",
		aspects: ["Poisonous tangleweed", "Sinkholes", "Statues of ancient lords"],
		body: "A two-foot carpet of glistening green-and-violet weeds around the Lonely Torch's hill, with forgotten nobility peering out of the vines. Moving through unprotected: DC 13 Constitution save or 7 (2d6) poison damage and poisoned for 1 hour (DC 12 Medicine over 10 minutes to cure). Urine-doused boots repel it entirely. A shambling mound the bandits call Strangleberries wanders the weeds — not aggressive, and likewise repelled by urine.",
	},
	{
		name: "The Lonely Torch",
		aspects: ["Ruined watchtower on a rocky hill", "Bandit garrison above and below", "A lonely, talkative gargoyle"],
		body: [
			"The Night Blades' old headquarters, now home to the new gang. A narrow path climbs through the Tangles to the tower.",
			"",
			"## Shattered Door",
			"*Ironbound wooden door, grinning gargoyle, narrow arrow slits.* Two guards (Osgood and Pulk) watch the arrow slits — usually too drunk or deep in knucklebones to notice quiet visitors. The door is barred from inside. The gargoyle above it can still speak, is lonely, and knows much of what happens inside; the bandits long since stopped listening.",
			"",
			"## Broken Hall",
			"*Collapsed beams, broken floor, headless statue of a warrior.* A fallen beam has smashed through to the basement passages. Four bandits (Sanda Sixtoes, Polard the Mule, Julette, Longtooth) sometimes stage here. They avoid the stirges upstairs — \"the Night Lord's children.\"",
			"",
			"## Shadowed Reaches",
			"*Hanging curtains of moss, collapsed walls, painted ceiling.* The tower's open-roofed upper level, its fresco shrouded in moss. Ten stirges lurk behind the moss; only Gardren is safe from them.",
			"",
			"## Sunken Cellars",
			"*Crumbling ceiling on wooden props, ragged bedrolls and hammocks.* Four bandits (Terra, Duke, Ashe Dragonknuckle, Two-Cups) and two thugs (Victor and Kingsteeth) may be sleeping here. A stone door carved with hooded priests leads deeper; a natural tunnel leads to the mud pit.",
			"",
			"## Mud Pit",
			"*Slick mud walls, barred drainpipe, knotted rope.* Two bandits (Pelpe and Klive Yellowriver) guard Ralavaz, imprisoned in the ten-foot mud pit and tormented by his brother — one guard keeps a bag holding a swarm of rats for the purpose, and dumps it out if attacked. Rescued, Ralavaz explains why he came back.",
			"",
			"## Lost Throne",
			"*Kneeling armored statues, stone throne on a dais, braziers, a well into shadow.* Gardren (bandit captain) holds court with four bandits (Avrin, Ragia, Thorn, Sasha); his stirge Heartspine (10 hp, Stealth +5) hides in a corner and defends him. Gardren wields Nightculler. The well hints at chambers below for expanding the adventure.",
		].join("\n"),
	},
];

export const NIGHT_BLADE_QUEST = {
	title: "The Night Blade",
	body: [
		"**Hook:** Sheriff Willowmane hires the party to root out the new Night Blades at the Lonely Torch and bring the newly released Ralavaz to justice.",
		"",
		"**The twist:** Ralavaz has repented — and his brother Gardren, thought dead in the barn fire, leads the new gang and keeps Ralavaz imprisoned in the tower's mud pit. The party must decide who to save, who to kill, and who to bring back to face justice.",
		"",
		"**Concluding:** The adventure ends when Gardren is dealt with and the party decides Ralavaz's fate — he accepts whatever punishment they or the village choose.",
		"",
		"**Expanding:** The well in the Lost Throne can lead to hidden chambers below; Ralavaz's road to amends can seed further quests. Either brother can be re-tied to a player character's past.",
	].join("\n"),
} as const;

/** Session 1, prepped and ready to run. Secret ids are assigned at creation
 * time by the builder — these are the texts, condensed from the adventure's
 * "Secrets and Clues" list. */
export const NIGHT_BLADE_SESSION = {
	strongStart: [
		"Light rain, gloomy mist. A large tree has fallen across the road, crushing a wagon under its weight — more fallen trees line the roadside. Six bandits lurk in hiding, and a voice calls out:",
		"",
		"> “Your weapons and belongings! Drop them to the ground, and in the name of the Night Blades, we'll spare your lives!”",
	].join("\n"),
	scenes: [
		"Ambush on the vale road",
		"Rumors in Whitesparrow",
		"The sheriff's offer",
		"Crossing the Tangles",
		"The Shattered Door",
		"The Broken Hall",
		"The Shadowed Reaches",
		"The Sunken Cellars",
		"The Mud Pit — Ralavaz",
		"The Lost Throne — Gardren",
	],
	secrets: [
		"Ten years ago villagers burned the trapped Night Blades alive in a barn — only Ralavaz escaped.",
		"Many of Whitesparrow's poor once turned bandit under the Night Blades' flag.",
		"The old Night Blades ran their operation from the Lonely Torch, now buried in poisonous tangleweed.",
		"A witness saw bandits pissing on their own boots before climbing to the tower.",
		"Urine-doused boots repel the tangleweed's worst effects.",
		"For the past year a new gang has built power at the Lonely Torch — recruiting bandits or slitting their throats.",
		"The gang's masked leader, the Night Lord, makes folk call them the Night Blades reborn.",
		"The Night Lord keeps some sort of red bird perched on his shoulder.",
		"The edges of the Night Lord's golden mask show horribly scarred skin.",
		"Weeks ago, villagers swear they saw Ralavaz himself returning to the Lonely Torch.",
	],
	npcs: ["[[Sheriff Ruth Willowmane]]", "[[Ralavaz the Night Blade]]", "[[Gardren the Night Lord]]"],
	locations: ["[[The Tangles]]", "[[The Lonely Torch]]"],
	monsters: [
		"6 × bandit (road ambush: Artur, Dobarn, Kirci, Dorra, Rhuda, Tasty Pete)",
		"Shambling mound — “Strangleberries” (the Tangles, not aggressive)",
		"2 × guard (Shattered Door)",
		"4 × bandit (Broken Hall)",
		"10 × stirge (Shadowed Reaches)",
		"4 × bandit + 2 × thug (Sunken Cellars)",
		"2 × bandit + swarm of rats (Mud Pit)",
		"Gardren (bandit captain) + 4 × bandit + Heartspine the stirge (Lost Throne)",
	],
	rewards: [
		"Nightculler — +1 silvered shortsword; an attuned wielder can cast darkness (no components) once per dawn",
		"The Night Blades' recently stolen goods, piled in the Lost Throne",
	],
} as const;
