# ant-simulation
# https://jhntrnr.github.io/ant-simulation/
A simulation of ants and pheromone trails

TL;DR - Ants want to find food, then bring the food back home. Depending on their goal, they deposit and follow different types of pheromones.

## Ant Behavior
### Ant States and Goals
- Ants spawn from red `AntSpawn` cells and seek out green `Food` cells.
- Ants try to bring food from a `Food` cell back to an `AntSpawn` cell.
- Ants are colored black when searching for food, and red when carrying food.
- Ants have two states: `FoodSearch` and `HomeSearch`.
- While in `FoodSearch` mode, ants lay down `searchPheromone` in their current cell and try to follow `returnPheromone` trails.
- While in `HomeSearch` mode, ants lay down `returnPheromone` in their current cell and try to follow `searchPheromone` trails.
### Pheromones
- Some pheromones are scalars, others are Vector2s.
  - `searchPheromone` and `returnPheromone` are Vector2s.
  - `avoidPheromone` and `distressPheromone` are scalars.
- Ants that are following a Vector2 pheromone trail follow it in reverse.
- Vector2 pheromones form a vector field that spans the grid of cells.
  - The vector field can be viewed in the simulation controls.
### Ant Movement and Collisions
- Ants move based on the vector field of pheromones.
- Ants that don't see any of the opposite pheromone wander randomly.
- Ants use a simple raycast (Bresenham's Line Algorithm) to determine line of sight.
- Ants collide with the edges of the canvas and with gray `Obstacle` cells.
- Obstacle cells block line of sight.
- Collisions cause ants to lay down `avoidPheromone` in their current cell.
- Ants ignore cells with a concentration of `avoidPheromone` over a threshold.
- Ant field of view for purposes of following pheromone trails is 60 degrees.
- Ants avoid `Predators` some of the time.
- Ants that see a Predator or that see another ant fall prey to a predator lay down `distressPheromone`.
- `distressPheromone` works similarly to `avoidPheromone`, causing ants to want to steer away.
### Ant Lifespans
- Ants continually spawn until a threshold of live ants is reached.
- Ants have a limited lifespan, represented by a small chance to die each frame.
- Dead ants are replaced with new ants.
## Simulation Behavior
- Pheromone concentrations in cells dissipates over time, as if by evaporation.
  - Pheromone dissipation runs every frame.
- Pheromone concentration in cells diffuses into neighboring cells slowly over time.
  - Pheromone diffusion runs every 100 frames.
- The grid layout can be saved to .json and downloaded, or loaded from a local .json file.
- Cells can be painted onto the grid by selecting a cell type from the dropdown and using the left mouse to draw.

## Future Improvements
- Ant collision with obstacle cells can be improved. Collision is currently handled by applying a static reuplsive force directly away from the wall when an ant is too close.
  - A sensible alternative is to reflect the ant's angle against the wall. Ants approaching from a shallow angle would be "bounced" away at a shallow angle. This would allow ants to better traverse narrow tunnels, a feat that real ants are capable of.
- Ant line of sight and collision are not compatible in all scenarios. Line of sight uses Bresenham's line algorithm, whereas collision detection uses the ant's distance to an obstacle. This causes some problems when an ant can see a cell with high pheromone concentration near a wall, but when it moves towards that cell, it collides with the wall. `avoidPheromones` that are deposited during collision events mitigate this problem in a way that is hopefully not too contrived.
  - A more complete solution would be to change either the line of sight, collision detection, or both to use the same core calculations so they never contradict each other.
- A balance between pheromone deposition, dissipation, and diffusion rates, as well as ant lifespan, is critical for the simulation to run properly. If a food source is too far away from an ant spawn and there is not a strong concentration of pheromones leading back home, the simulation breaks down and the ants can get stuck following loops that lead nowhere. This compounds when food-carrying ants follow food-searching ants who are following the original food-carrying ants.
  - This is mitigated by ants periodically dying and being replaced. New ants leaving the spawn cell will tend to paint that area strongly with `searchPheromone` which should over time lead ants back home. There are many paths to further correct this behavior: 
    - A short memory of recently-visited cells that an ant stores when following pheromone trails. The ant would strongly deprioritize cells that are in its memory to avoid tight loops that lead nowhere.
    - A more global sense of direction. At least some species of ants seem to use magnetic fields to aid in their navigation [[1]](#1). This could be implemented either by applying an approximation of a magnetic field to the grid that the ants are aware of. Ants wouldn't be drawn to or repulsed by areas of this magnetic field directly, but their decision making might be influenced by it.
    - The ants could keep track of their overall displacement relative to their home cell. This displacement would be stored as a unit vector and would be used to influence decision making when the ant's state changes. The displacement vector would act as a compass that points home; the ants would not directly follow this compass, but would perhaps prefer movement in the general direction of the compass.
    

## References
<a id="1">[1]</a>
Pereira MC, Guimarães IdC, Acosta-Avalos D, Antonialli Junior WF [(2019)](https://doi.org/10.1371/journal.pone.0225507)
Can altered magnetic field affect the foraging behaviour of ants?
PLoS ONE 14(11): e0225507.
