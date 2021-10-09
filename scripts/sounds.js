
function playSound(sound, p = 0) {

	if (!playSounds)
		return;

	switch (sound) {

	case "YUKO-A":
		zzfx(...[1.01, 0, 1395, , .08, .22, , 1.19, , , -579, .06, , , , , , .57, .01, .12]); // Pickup 126
		break;
	case "YUKO-B":
		zzfx(...[1.01, .15, 146.8324, , .08, .22, , 1.19, , , -579, .06, , , , , , .57, .01, .12]); // Pickup 126
		break;

	case "TIE":
		zzfx(...[1.01, 0, 187, , , .23, 2, 3.6, 2.3, , 200, .09, , , , , , .9, .03, .03]); // Hit 78
		//zzfx(...[2.29, , 1460, , .08, .13, 1, .52, .2, , , , .06, , -2, -0.2, .01, .62, .07, .1]); // Pickup 55 - Mutation 6
		break;

	case "HIT":
		if (!playCollisionSound)
			return;
		//zzfx(...[,-0.05,65.40639,.01,,0,,0,,,,,,,,,.18,0,.01]); // Random 6
		break;

	default:
		break;
	}

}
