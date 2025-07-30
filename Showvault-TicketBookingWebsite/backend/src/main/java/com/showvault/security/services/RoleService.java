package com.showvault.security.services;

import com.showvault.model.Role;
import com.showvault.model.ERole;
import com.showvault.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class RoleService {

    @Autowired
    private RoleRepository roleRepository;

    @PostConstruct
    public void init() {
        if (roleRepository.count() == 0) {
            // Initialize default roles
            Role userRole = new Role(ERole.ROLE_USER);
            roleRepository.save(userRole);

            Role adminRole = new Role(ERole.ROLE_ADMIN);
            roleRepository.save(adminRole);

            Role organizerRole = new Role(ERole.ROLE_ORGANIZER);
            roleRepository.save(organizerRole);
        }
    }
}