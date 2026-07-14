// Pure — no `obsidian` import. Verbatim transcription of "Bosses and Minions"
// and "Monsters by Adventure Location" from the Lazy GM's 5e Monster Builder
// Resource Document (CC-BY 4.0 — see `attribution.ts`). Plain lookup
// constants, not RollTables (precedent: stress.ts's STRESS_PROCEDURE) — these
// are browsed, not rolled. Bold boss markers from the source are carried as
// a leading boss name field instead of inline markdown.

export interface BossMinionPairing {
	bossCr: number;
	boss: string;
	environments: string;
	minions: string;
}

export const BOSS_MINION_PAIRINGS: readonly BossMinionPairing[] = [
	{ bossCr: 1, boss: "Goblin boss", environments: "Caves, mountains", minions: "Goblins, worgs" },
	{ bossCr: 2, boss: "Bandit captain", environments: "Cities, sewers, ruins", minions: "Bandits, spies, thugs, berserkers, gladiators" },
	{ bossCr: 2, boss: "Cult fanatic", environments: "Cities, ruins", minions: "Cultists, bandits, thugs, dretches" },
	{ bossCr: 2, boss: "Ettercap", environments: "Caves, ruins", minions: "Giant spiders" },
	{ bossCr: 2, boss: "Ghast", environments: "Ruins, crypts, cities, sewers", minions: "Ghouls, zombies" },
	{ bossCr: 2, boss: "Gnoll pack lord", environments: "Plains, caves, ruins", minions: "Gnolls, hyenas" },
	{ bossCr: 2, boss: "Ogre", environments: "Ruins, caves", minions: "Orcs, goblins" },
	{ bossCr: 2, boss: "Sea hag", environments: "Coves, swamps, grottos", minions: "Giant constrictor snakes, crocodiles" },
	{ bossCr: 3, boss: "Bugbear chief", environments: "Keeps, fortresses, ruins, caves", minions: "Bugbears, goblins, worgs" },
	{ bossCr: 3, boss: "Green hag", environments: "Forests, swamps", minions: "Bullywugs, giant toads, giant constrictor snakes, imps, quasits" },
	{ bossCr: 3, boss: "Winter wolf", environments: "Frozen mountains, frozen ruins", minions: "Dire wolves, ice mephits" },
	{ bossCr: 4, boss: "Banshee", environments: "Ruins, crypts", minions: "Specters, skeletons" },
	{ bossCr: 4, boss: "Bone naga", environments: "Ruins, crypts", minions: "Skeletons, specters, wights" },
	{ bossCr: 4, boss: "Ettin", environments: "Mountains, ruins, caves", minions: "Ogres, orcs" },
	{ bossCr: 4, boss: "Lamia", environments: "Ruins, towers, caves", minions: "Jackalweres" },
	{ bossCr: 4, boss: "Lizard king/queen", environments: "Swamps, sunken grottos", minions: "Lizardfolk shamans, lizardfolk, monitor lizards" },
	{ bossCr: 5, boss: "Hill giant", environments: "Mountains, ruins, caves", minions: "Ogres, orcs, bugbears, goblins, cave bears" },
	{ bossCr: 5, boss: "Night hag", environments: "Ruins, crypts, Lower Planes", minions: "Hell hounds, quasits, manes, shadow demons" },
	{ bossCr: 5, boss: "Sahuagin baron", environments: "Coves, grottos, underwater ruins", minions: "Sahuagin priestesses, sahuagin, reef sharks, giant octopuses, krakens" },
	{ bossCr: 5, boss: "Wraith", environments: "Ruins, crypts", minions: "Flameskulls, specters, wights" },
	{ bossCr: 6, boss: "Hobgoblin warlord", environments: "Ruins, keeps, fortresses", minions: "Hobgoblin captains, hobgoblins, bugbears, goblins, worgs" },
	{ bossCr: 6, boss: "Mage", environments: "Towers, cities", minions: "Animated armor, imps, acolytes, flesh golems, veterans" },
	{ bossCr: 6, boss: "Medusa", environments: "Ruins, caves", minions: "Basilisks, giant constrictor snakes, death dogs" },
	{ bossCr: 7, boss: "Oni", environments: "Ruins, caves, cities", minions: "Hobgoblins, orcs" },
	{ bossCr: 8, boss: "Frost giant", environments: "Frozen mountains, frozen ruins", minions: "Yetis, young white dragons, polar bears, winter wolves" },
	{ bossCr: 9, boss: "Fire giant", environments: "Volcanoes, caverns", minions: "Hell hounds, young red dragons, salamanders, azers, fire mephits" },
	{ bossCr: 9, boss: "Glabrezu", environments: "Lower Planes, ruins, towers", minions: "Barlguras, chasmes" },
	{ bossCr: 10, boss: "Aboleth", environments: "Caverns, coves, lakes", minions: "Chuuls, cult fanatics, hydras, NPCs (enthralled), sea hags" },
	{ bossCr: 11, boss: "Efreeti", environments: "Ruins, volcanoes, cities, deserts", minions: "Fire elementals, salamanders, fire snakes" },
	{ bossCr: 11, boss: "Horned devil", environments: "Lower Planes, ruins, towers", minions: "Barbed devils, bearded devils, spined devils" },
	{ bossCr: 12, boss: "Archmage", environments: "Towers, cities", minions: "Animated armor, imps, cambions, demons (any), elementals, golems" },
	{ bossCr: 13, boss: "Adult white dragon", environments: "Frozen mountains, frozen ruins", minions: "Yetis" },
	{ bossCr: 13, boss: "Vampire", environments: "Ruins, crypts", minions: "Vampire spawn, giant bats, dire wolves, specters, wights" },
	{ bossCr: 14, boss: "Adult black dragon", environments: "Swamps, sunken grottos", minions: "Giant crocodiles, trolls, bullywugs, lizardfolk, kuo-toa" },
	{ bossCr: 15, boss: "Adult green dragon", environments: "Forests, ruins, caverns", minions: "Treants, elves" },
	{ bossCr: 15, boss: "Mummy lord", environments: "Ruins, crypts", minions: "Mummies, skeletons, wights, cult fanatics" },
	{ bossCr: 16, boss: "Adult blue dragon", environments: "Deserts, ruins, towers", minions: "Air elementals, mages" },
	{ bossCr: 16, boss: "Marilith", environments: "Lower Planes, ruins, towers", minions: "Hezrous, vrocks" },
	{ bossCr: 17, boss: "Adult red dragon", environments: "Mountains, volcanoes, ruins, caverns", minions: "Fire elementals, kobolds" },
	{ bossCr: 17, boss: "Death knight", environments: "Crypts, ruins, Lower Planes", minions: "Wights, wraiths, liches, flameskulls, nightmares, revenants" },
	{ bossCr: 19, boss: "Balor", environments: "Lower planes, ruins", minions: "Mariliths, glabrezus, goristros, cambions, cult fanatics" },
	{ bossCr: 20, boss: "Ancient white dragon", environments: "Frozen mountains, frozen ruins", minions: "Abominable yetis" },
	{ bossCr: 20, boss: "Pit fiend", environments: "Lower planes, ruins, towers", minions: "Horned devils, bone devils, erinyes" },
	{ bossCr: 21, boss: "Ancient black dragon", environments: "Swamps, sunken grottos", minions: "Giant crocodiles, trolls, bullywugs, lizardfolk" },
	{ bossCr: 21, boss: "Lich", environments: "Ruins, towers, crypts, caves", minions: "Death knights, iron golems, wraiths, mages" },
	{ bossCr: 22, boss: "Ancient green dragon", environments: "Forests, ruins, caverns", minions: "Treants, elves" },
	{ bossCr: 23, boss: "Ancient blue dragon", environments: "Deserts, ruins, towers", minions: "Air elementals, mages" },
	{ bossCr: 24, boss: "Ancient red dragon", environments: "Mountains, volcanoes, ruins, caverns", minions: "Fire giants, fire elementals, kobolds" },
];

export interface LocationEncounterRow {
	/** Level band, verbatim — "1st", "2nd to 4th", "17th to 20th". */
	levelBand: string;
	/** One example encounter; the boss the source bolds leads the sentence. */
	encounter: string;
}

export interface LocationMonsterTable {
	id: string;
	name: string;
	rows: readonly LocationEncounterRow[];
}

export const MONSTERS_BY_LOCATION: readonly LocationMonsterTable[] = [
	{
		id: "ancient-ruins",
		name: "Ancient ruins",
		rows: [
			{ levelBand: "1st", encounter: "A thug leads bandits intending to rob a caravan." },
			{ levelBand: "1st", encounter: "A vengeful shadow shifts in the darkness among a handful of arisen skeletons." },
			{ levelBand: "2nd to 4th", encounter: "A pair of bugbear entrepreneurs use goblin actors as bait to seek adventurers as prey." },
			{ levelBand: "2nd to 4th", encounter: "A sorrowful banshee orders specters to recreate their former beautiful life." },
			{ levelBand: "2nd to 4th", encounter: "A gnoll pack lord bounty hunter leads gnolls and hyenas after an escaped prisoner." },
			{ levelBand: "2nd to 4th", encounter: "A death dog protected by wolves lairs in a ruined cave." },
			{ levelBand: "2nd to 4th", encounter: "A lamia served by jackalweres dwells in an illusory paradise." },
			{ levelBand: "5th to 10th", encounter: "A wise bugbear chief leads bugbear and goblin soldiers from an obsidian throne." },
			{ levelBand: "5th to 10th", encounter: "A cyclops matriarch leads fanatically loyal ogres." },
			{ levelBand: "5th to 10th", encounter: "A solitary medusa dwells in a mausoleum, surrounded by petrified heroes and protected by death dogs." },
			{ levelBand: "5th to 10th", encounter: "A noble oni in a posh den is guarded by loyal spirit naga storytellers." },
			{ levelBand: "11th to 16th", encounter: "An adult blue dragon is guarded by clay golems in a jeweled lair." },
			{ levelBand: "17th to 20th", encounter: "An ancient blue dragon protected by stone golems and air elementals dwells in the shattered remains of a tower." },
		],
	},
	{
		id: "crypts",
		name: "Crypts, catacombs, necropolises",
		rows: [
			{ levelBand: "1st", encounter: "A pair of skeletons rises from a pile of crawling claws." },
			{ levelBand: "2nd to 4th", encounter: "A lost ghost wanders, surrounded by specters." },
			{ levelBand: "2nd to 4th", encounter: "A bone naga rises from an obsidian sarcophagus to command a host of skeletons." },
			{ levelBand: "5th to 10th", encounter: "A mummy lord entombed in a cold-iron sarcophagus is guarded by mummies and wights." },
			{ levelBand: "5th to 10th", encounter: "A pair of wraiths float above unholy urns surrounded by vengeful specters." },
			{ levelBand: "11th to 16th", encounter: "A vampire in a gilded tomb is guarded by howling dire wolves and served by vampire spawn." },
			{ levelBand: "17th to 20th", encounter: "A lich in an unhallowed laboratory is protected by loyal death knights and iron golems." },
		],
	},
	{
		id: "city-sewers",
		name: "City sewers",
		rows: [
			{ levelBand: "1st", encounter: "A wandering zombie is covered by a swarm of rats." },
			{ levelBand: "2nd to 4th", encounter: "An erudite ghast weaves fantastic tales to their ravenous ghoul followers." },
			{ levelBand: "2nd to 4th", encounter: "A spy is guarded by unscrupulous bandits while awaiting the arrival of a contact." },
			{ levelBand: "2nd to 4th", encounter: "An otyugh luxuriates in a watery pit, surrounded by concealed gray oozes." },
			{ levelBand: "2nd to 4th", encounter: "Wererats try to be intimidating by threatening to feed prisoners to their giant rat pets." },
		],
	},
	{
		id: "seedy-streets",
		name: "Seedy city streets",
		rows: [
			{ levelBand: "1st", encounter: "A giant rat and the swarm of rats that travels with them are feeding on a dead body." },
			{ levelBand: "1st", encounter: "A thug and a pack of bandit toadies are waiting for someone to rob." },
			{ levelBand: "2nd to 4th", encounter: "A spy assisted by thugs has been hired to steal something from the characters." },
			{ levelBand: "2nd to 4th", encounter: "A bandit captain with berserker bodyguards and bandit followers is easily insulted." },
			{ levelBand: "2nd to 4th", encounter: "A cult fanatic leads cultists who have summoned ravenous dretches into the world." },
			{ levelBand: "5th to 10th", encounter: "A mage commanding veterans is seeking something the characters seek as well." },
			{ levelBand: "5th to 10th", encounter: "A bandit captain protected by hired gladiators and veterans seeks the characters with an offer they can't refuse." },
			{ levelBand: "5th to 10th", encounter: "A careful assassin backed up by spies and thugs hunts the characters." },
		],
	},
	{
		id: "wizards-tower",
		name: "Wizard's tower",
		rows: [
			{ levelBand: "1st", encounter: "A loyal imp commands a squad of guardian flying swords." },
			{ levelBand: "2nd to 4th", encounter: "A summoned succubus or incubus directs animated armor serving as guards." },
			{ levelBand: "5th to 10th", encounter: "Apprentice mages command elementals and flesh golems." },
			{ levelBand: "5th to 10th", encounter: "An important chamber is guarded by two flameskulls and a number of helmed horrors." },
			{ levelBand: "11th to 16th", encounter: "An impatient archmage is protected by two stone golems in an arcane laboratory." },
			{ levelBand: "17th to 20th", encounter: "A lich studies the multiverse while protected by bound balors and iron golems." },
		],
	},
	{
		id: "volcano-lair",
		name: "Volcano lair",
		rows: [
			{ levelBand: "5th to 10th", encounter: "A fire giant with pet hell hounds commands an azer to dig for them." },
			{ levelBand: "5th to 10th", encounter: "A trapped efreeti uses fire elementals to fight for freedom." },
			{ levelBand: "11th to 16th", encounter: "An adult red dragon served by salamanders demands fealty from the characters." },
			{ levelBand: "17th to 20th", encounter: "An ancient red dragon worshiped by fire giants awakens from slumber." },
		],
	},
	{
		id: "abyssal-keep",
		name: "Abyssal keep",
		rows: [
			{ levelBand: "2nd to 4th", encounter: "A night hag and their pet quasit schemes within a chamber guarded by hell hounds." },
			{ levelBand: "2nd to 4th", encounter: "A summoning circle disgorges a barlgura and a gang of dretches." },
			{ levelBand: "5th to 10th", encounter: "A glabrezu commands from a throne flanked by chasmes." },
			{ levelBand: "11th to 16th", encounter: "A marilith, their cambion advisor, and a number of hezrou servants guard a planar gateway." },
			{ levelBand: "17th to 20th", encounter: "A balor, a servile archmage, and a squad of glabrezu soldiers guard an artifact." },
		],
	},
	{
		id: "dark-forests",
		name: "Dark forests and fetid swamps",
		rows: [
			{ levelBand: "1st", encounter: "An elf cultist hunts prey with bloodthirsty wolves." },
			{ levelBand: "2nd to 4th", encounter: "Two ettercaps and their giant spiders stalk adventurers." },
			{ levelBand: "2nd to 4th", encounter: "An ettin warlord commands a host of orc mercenaries." },
			{ levelBand: "2nd to 4th", encounter: "A green hag lurks in an old hut with a pet giant toad, and is guarded by loyal bullywugs." },
			{ levelBand: "2nd to 4th", encounter: "A werewolf prowls the shadows with their dire wolf companions." },
			{ levelBand: "5th to 10th", encounter: "An orc war chief commands a force of ettin and orc scouts based in a ruined keep." },
			{ levelBand: "11th to 16th", encounter: "An adult black dragon commands a host of trolls made loyal through fear." },
			{ levelBand: "11th to 16th", encounter: "An adult green dragon lurks in a dead forest, protected by shambling mounds." },
			{ levelBand: "17th to 20th", encounter: "An ancient black dragon dwells in a sunken bog filled with giant crocodiles." },
			{ levelBand: "17th to 20th", encounter: "An ancient green dragon rules from an ancient wooden throne guarded by loyal treants." },
		],
	},
	{
		id: "hellish-citadel",
		name: "Hellish citadel",
		rows: [
			{ levelBand: "2nd to 4th", encounter: "A bearded devil draws lemures through a portal connected to the river Styx." },
			{ levelBand: "2nd to 4th", encounter: "A barbed devil and a host of imps keep watch on enemy forces." },
			{ levelBand: "5th to 10th", encounter: "An armored erinyes commanding a host of spined devils prepares for war." },
			{ levelBand: "5th to 10th", encounter: "A horned devil leading bearded devil soldiers guards an oracular sphere." },
			{ levelBand: "11th to 16th", encounter: "Ice devil wardens and bone devil guards protect a valuable prisoner." },
			{ levelBand: "17th to 20th", encounter: "Pit fiend commanders and horned devil lieutenants use scrying crystals to get the drop on the characters." },
		],
	},
	{
		id: "frozen-fortress",
		name: "Frozen fortress",
		rows: [
			{ levelBand: "5th to 10th", encounter: "Frost giant hunters enjoy the sport of their remorhaz pet stalking commoners." },
			{ levelBand: "5th to 10th", encounter: "The bone-cluttered cave of an abominable yeti is guarded by winter wolves." },
			{ levelBand: "11th to 16th", encounter: "An adult white dragon is served by loyal frost giants." },
			{ levelBand: "17th to 20th", encounter: "An ancient white dragon lairing atop an inaccessible peak is worshiped by generations of abominable yetis." },
		],
	},
	{
		id: "deep-caverns",
		name: "Deep caverns",
		rows: [
			{ levelBand: "1st", encounter: "A cockatrice pecks at a crumbling statue, while stirges linger above." },
			{ levelBand: "1st", encounter: "A giant bat surrounded by swarms of bats skulks in the shadows." },
			{ levelBand: "2nd to 4th", encounter: "Darkmantles and piercers lurk in pools of shadow." },
			{ levelBand: "2nd to 4th", encounter: "A worg-riding goblin boss commands a squad of goblin hunters." },
			{ levelBand: "5th to 10th", encounter: "Basilisks and cockatrices lair in a hall full of petrified adventurers." },
			{ levelBand: "5th to 10th", encounter: "A cloaker lurks above a pack of hook horrors disemboweling a dead bulette." },
			{ levelBand: "5th to 10th", encounter: "Ropers and darkmantles hang above a waterfall, competing for prey." },
		],
	},
	{
		id: "sunken-grotto",
		name: "Sunken grotto",
		rows: [
			{ levelBand: "1st", encounter: "A lizardfolk hunter is teaching their trained giant crabs how to hunt." },
			{ levelBand: "2nd to 4th", encounter: "A sea hag commands loyal kuo-toa to set up an effigy to a fictitious god." },
			{ levelBand: "2nd to 4th", encounter: "A lizard king with a lizardfolk shaman advisor commands a clan of lizardfolk from a coral throne." },
			{ levelBand: "5th to 10th", encounter: "An aboleth in a swirling pool is guarded by chuuls and worshiped by enthralled veterans." },
			{ levelBand: "5th to 10th", encounter: "A sahuagin baron watches a pack of sahuagin fight water weirds." },
			{ levelBand: "5th to 10th", encounter: "A corrupt sahuagin priestess feeds sacrificial victims to giant crocodiles." },
			{ levelBand: "11th to 16th", encounter: "A kraken rules a deep-sea trench, surrounded by reverent water elementals." },
		],
	},
];
