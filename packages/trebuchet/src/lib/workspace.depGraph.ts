import { Project } from '@bscotch/project';
import { assertUserClaim } from '@bscotch/validation';
import { DepGraph } from 'dependency-graph';

export interface WorkspaceDependencyGraphOptions {
  excludeDevDependencies?: boolean;
}

export class ProjectGraph {
  protected graph: DepGraph<Project>;

  constructor(
    projects: Project[],
    options: WorkspaceDependencyGraphOptions = {},
  ) {
    this.graph = new DepGraph<Project>();
    for (const project of projects) {
      this.addProject(project);
      // Check the deps for other projects
      for (const otherProject of projects) {
        if (project === otherProject) {
          continue;
        }
        const dep = project.packageJson.findDependency(otherProject.name);
        // Only changes to non-dev deps
        if (
          dep &&
          (!options?.excludeDevDependencies || dep.type === 'dependencies')
        ) {
          this.addProjectDependency(project, otherProject);
        }
      }
    }
  }

  dependentsOf(project: Project): Project[] {
    return this.graph
      .dependentsOf(project.name.toString())
      .map((name) => this.getProject(name));
  }

  /**
   * Get a shallow copy of the list of all projects in the graph.
   *
   * Shorthand for `[...this]`.
   */
  list(): Project[] {
    return [...this];
  }

  /**
   * Iterate over the projects in order of the dependency graph,
   * with leaves first.
   */
  *[Symbol.iterator](): Iterator<Project> {
    for (const project of this.graph.overallOrder()) {
      yield this.graph.getNodeData(project);
    }
  }

  getProject(name: string): Project {
    return this.graph.getNodeData(name);
  }

  /**
   * Add a project to the graph.
   */
  protected addProject(project: Project) {
    this.graph.addNode(project.name.toString(), project);
  }

  protected addProjectDependency(from: Project, to: Project): void {
    // Ensure the dep has a node

    assertUserClaim(
      from.packageJson.canDependOn(to.packageJson),
      `${from.name} cannot depend on ${to.name} due to publishing access differences.`,
    );
    this.addProject(to);
    this.graph.addDependency(from.name.toString(), to.name.toString());
  }
}
