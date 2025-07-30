package com.showvault.repository;


import com.showvault.model.ERole;
import com.showvault.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    
    Optional<Role> findByName(ERole name);
    
    boolean existsByName(ERole name);
}