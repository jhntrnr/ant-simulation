# ant-simulation
# https://jhntrnr.github.io/ant-simulation/
A simulation of ants and pheromone trails. Inspired by "Simple Ants simulator" [[1]](#1)

TL;DR - Ants want to find food, then bring the food back home. Depending on their goal, they deposit and follow different types of pheromones.

This project is designed for use on desktop browsers. Mobile is not supported, and the performance is likely poor.

Ants
- Ants spawn from blue `Ant Spawn` cells and seek out green `Food` cells.
- Ants continually spawn from `Ant Spawn` cells until there are `maxAnts` on screen.
- Ants periodically die, to be replaced by a freshly spawned ant.
- Ants have two states: `Food Search` (black ants) and `Home Search` (gold ants) that define their current goal and behavior.
- When in `Food Search` mode, ants lay down `Search Pheromone` in their current cell.
- When in `Home Search` mode, ants lay down `Return Pheromone` in their current cell.
- Ants have a limited vision range and limited field of view.

Pheromones
- This simulation has two types of pheromone: Vector2 and Scalar.
- Vector2 pheromones have a magnitude and direction; Scalar pheromones just have a magnitude.
  - Vector2 pheromones are an abstraction of pheromone *gradients* across a cell.
  - Scalar pheromones represent a simple *concentration* in a cell.
- All pheromones have a maximum magnitude of 1.
- Pheromones dissipate from a cell slowly over time via evaporation.
- Pheromones diffuse between cells slowly over time.

![Vector2Pheromones](https://github.com/jhntrnr/ant-simulation/assets/90057903/ced10fb6-6ef9-462e-809b-2742479e1bc3)


Ant Movement
- Ants wander randomly in search of their goal (either `Food` or `Ant Spawn`) unless they see a Vector2 pheromone of the correct type, either `Search Pheromone` or `Return Pheromone`.
- Ants who see such a pheromone will follow its vector field in reverse.
  - This greatly improves the ants' navigaitonal abilities without giving them access to information outside their vision range or field of view.
- Ants collide with the borders of the simulation canvas and with `Obstacle` cells.
- Ants who see Predators try to steer away.
- Ants who see a high concentration of `Distress Pheromone` try to steer away.

Predators
- Predators spawn from orange `Predator Spawn` cells and seek out ants directly.
- Predators wander randomly unless they see an ant nearby, in which case they move towards that ant.
- When a Predator gets close enough to an ant, the ant dies.
- Predators have a digestion time which keeps them stationary after killing an ant.
- Ants who see a predator--or see another ant fall prey to a predator--lay strongly concentrated `Distress Pheromone`.
- Predators are not social creatures like ants and therefore do not lay or follow pheromones themselves.

Simulation Behavior
- The `Simulation Controls` area allows the user to pause/start, selectively hide certain objects, and change the view mode.
- Cells can be drawn on the canvas by selecting the Cell Type and Brush Size, then using the left mouse button.
- Pheromones can be drawn on the canvas by selecting the Pheromone Type, Strength, and Brush size, then using shift + left mouse button.
  - For drawing Vector2 pheromones, it is helpful to set the simulation view mode to `Vector Pheromones` to visualize the vector fields.
- Most organism variables can be controlled via sliders in the `Organism Controls` section.
- The state of the grid (minus live organisms and current pheromone state) can be saved to .json and loaded for future use.

Future Improvements
- Ant collision with obstacle cells can be improved. Collision is currently handled by applying a static reuplsive force directly away from the wall when an ant is too close.
  - A sensible alternative is to reflect the ant's angle against the wall. Ants approaching from a shallow angle would be "bounced" away at a shallow angle. This would allow ants to better traverse narrow tunnels, a feat that real ants are capable of.
- Ant line of sight and collision are not compatible in all scenarios. Line of sight uses Bresenham's line algorithm, whereas collision detection uses the ant's distance to an obstacle. This causes some problems when an ant can see a cell with high pheromone concentration near a wall, but when it moves towards that cell, it collides with the wall. `Avoid Pheromones` that are deposited during collision events mitigate this problem in a way that is hopefully not too contrived.
  - A more complete solution would be to change either the line of sight, collision detection, or both to use the same core calculations so they never contradict each other.
- A balance between pheromone deposition, dissipation, and diffusion rates, as well as ant lifespan, is critical for the simulation to run properly. If a food source is too far away from an ant spawn and there is not a strong vector field leading back home, the simulation breaks down and the ants can get stuck wandering aimlessly.
  - This is mitigated by ants periodically dying and being replaced. New ants leaving the spawn cell will tend to paint that area strongly with `searchPheromone` which should over time lead ants back home. There are many paths to further correct this behavior: 
    - A short memory of recently-visited cells that an ant stores when following pheromone trails. The ant would strongly deprioritize cells that are in its memory to avoid tight loops that lead nowhere.
    - A more global sense of direction. At least some species of ants seem to use magnetic fields to aid in their navigation [[2]](#2). This could be implemented by applying an approximation of a magnetic field to the grid. Ants wouldn't be drawn to or repulsed by areas of this magnetic field directly, but their decision making might be influenced by it.
    - The ants could keep track of their overall displacement relative to their home cell. This displacement would be stored as a unit vector and would be used to influence decision making when the ant's state changes. The displacement vector would act as a compass that points home; the ants would not directly follow this compass, but would perhaps prefer movement in the general direction of the compass.

## References
<a id="1">[1]</a>
johnBuffer, AntSimulator [(2020)](https://github.com/johnBuffer/AntSimulator)

<a id="2">[2]</a>
Pereira MC, Guimarães IdC, Acosta-Avalos D, Antonialli Junior WF [(2019)](https://doi.org/10.1371/journal.pone.0225507)
Can altered magnetic field affect the foraging behaviour of ants?
PLoS ONE 14(11): e0225507.
