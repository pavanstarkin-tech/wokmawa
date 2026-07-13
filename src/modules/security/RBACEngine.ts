import dbService from "../../core/database/DatabaseService";

export interface UserRole {
  userId: string;
  roleName: "Owner" | "Manager" | "Cashier" | "Captain" | "Kitchen";
  permissionsList: string[];
}

export class RBACEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public async setRolePermissions(userId: string, role: string, permissions: string[]): Promise<void> {
    await this.db.execute(
      `INSERT INTO user_roles (userId, roleName, permissionsList)
       VALUES (?, ?, ?)
       ON CONFLICT(userId) 
       DO UPDATE SET roleName = ?, permissionsList = ?`,
      [userId, role, permissions.join(","), role, permissions.join(",")]
    );
  }

  public async checkPermission(userId: string, requiredPermission: string): Promise<boolean> {
    const rows = await this.db.query("SELECT * FROM user_roles WHERE userId = ?", [userId]);
    if (rows.length === 0) {
      // Default fallback Cashier privileges
      return requiredPermission === "Can Close Shift";
    }

    const perms = (rows[0].permissionsList || "").split(",");
    return perms.includes(requiredPermission) || rows[0].roleName === "Owner";
  }

  public async verifyManagerOverride(managerPin: string): Promise<boolean> {
    // Override PIN verification check
    return managerPin === "9999";
  }
}

export const rbacEngine = new RBACEngine();
export default rbacEngine;
